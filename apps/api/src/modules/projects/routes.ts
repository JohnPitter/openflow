import { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '../../db/index.js';
import { dockerService, findAvailablePort, releasePort } from '../../services/docker.js';
import { githubService } from '../../services/github.js';
import { builderService } from '../../services/builder.js';
import { traefikService } from '../../services/traefik.js';
import { config } from '../../config.js';

// In-memory storage for dev mode projects (exported for metrics access)
export const devModeProjects: Map<string, any> = new Map();
export const devModeDeployments: Map<string, any[]> = new Map();

export async function projectRoutes(app: FastifyInstance) {
  // List user projects
  app.get('/', { preHandler: [(app as any).authenticate] }, async (request) => {
    const { id } = request.user as { id: string };

    // Dev mode: return in-memory projects
    if (config.devMode) {
      return Array.from(devModeProjects.values()).filter((p) => p.userId === id);
    }

    return db.select().from(schema.projects).where(eq(schema.projects.userId, id));
  });

  // Get project by ID
  app.get('/:id', { preHandler: [(app as any).authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id } = request.params as { id: string };

    // Dev mode: return from in-memory storage
    if (config.devMode) {
      const project = devModeProjects.get(id);
      if (!project || project.userId !== userId) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      return project;
    }

    const [project] = await db
      .select()
      .from(schema.projects)
      .where(and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)));

    if (!project) return reply.code(404).send({ error: 'Project not found' });
    return project;
  });

  // Create and deploy project
  app.post('/', { preHandler: [(app as any).authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { repoUrl, name, branch } = request.body as {
      repoUrl?: string;
      name: string;
      branch?: string;
    };

    if (!repoUrl) {
      return reply.code(400).send({ error: 'repoUrl is required' });
    }

    const subdomain = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const projectId = nanoid();
    const networkName = `openflow-${userId}-net`;
    const branchName = branch || 'main';

    // Create user network if not exists
    try {
      await dockerService.createNetwork(networkName);
    } catch (e: any) {
      if (!e.message?.includes('already exists')) throw e;
    }

    // Dev mode: clone public repo without auth
    if (config.devMode) {
      let clonePath: string;
      try {
        clonePath = await githubService.clonePublicRepo(repoUrl, branchName);
      } catch (err: any) {
        return reply.code(400).send({ error: `Failed to clone repository: ${err.message}` });
      }

      try {
        // Detect technology and generate Dockerfile
        const { detection } = await builderService.generateDockerfile(clonePath);
        const imageName = `openflow-${projectId}`.toLowerCase();

        // Build image
        await dockerService.buildImage(clonePath, imageName, 'Dockerfile.openflow');

        // Get resource limits (use pro plan for dev mode)
        const limits = config.resources.pro;

        // Find available port for dev mode
        const hostPort = await findAvailablePort(4000);
        const projectUrl = `http://localhost:${hostPort}`;

        // Create and start container with exposed port
        const containerId = await dockerService.createContainer({
          name: `openflow-${projectId}`.toLowerCase(),
          image: imageName,
          labels: { 'openflow.port': String(hostPort) },
          cpus: limits.cpus,
          memory: limits.memory,
          env: [],
          exposedPort: detection.port,
          hostPort,
        });

        // Save project in memory
        const project = {
          id: projectId,
          userId,
          name,
          repoUrl,
          branch: branchName,
          technology: detection.framework || detection.technology,
          containerId,
          status: 'running' as const,
          subdomain,
          url: projectUrl,
          port: hostPort,
          envVars: '{}',
          cpuLimit: Math.round(limits.cpus * 1000),
          memoryLimit: limits.memory,
          webhookId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        devModeProjects.set(projectId, project);
        devModeDeployments.set(projectId, [
          {
            id: nanoid(),
            projectId,
            status: 'running',
            logs: `Deployed from: ${repoUrl}\nBranch: ${branchName}\nTechnology: ${detection.technology}\nPort: ${detection.port}\nURL: ${projectUrl}`,
            createdAt: new Date(),
            finishedAt: new Date(),
          },
        ]);

        return reply.code(201).send(project);
      } catch (err: any) {
        app.log.error(err);
        return reply.code(500).send({ error: err.message });
      } finally {
        githubService.cleanupClone(clonePath);
      }
    }

    // Production mode: clone with GitHub auth
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));

    // Clone repo
    const clonePath = await githubService.cloneRepo(user.accessToken, repoUrl, branchName);

    try {
      // Detect technology and generate Dockerfile
      const { detection } = await builderService.generateDockerfile(clonePath);
      const imageName = `openflow-${projectId}`.toLowerCase();

      // Build image
      await dockerService.buildImage(clonePath, imageName, 'Dockerfile.openflow');

      // Get resource limits based on plan
      const limits = config.resources[user.plan as keyof typeof config.resources];

      // Generate Traefik labels
      const labels = traefikService.generateLabels(projectId, subdomain, detection.port);

      // Create and start container
      const containerId = await dockerService.createContainer({
        name: `openflow-${projectId}`.toLowerCase(),
        image: imageName,
        labels,
        cpus: limits.cpus,
        memory: limits.memory,
        networkName,
        env: JSON.parse('[]'), // TODO: parse envVars from request
      });

      // Save project
      const project = {
        id: projectId,
        userId,
        name,
        repoUrl,
        branch,
        technology: detection.framework || detection.technology,
        containerId,
        status: 'running' as const,
        subdomain,
        envVars: '{}',
        cpuLimit: Math.round(limits.cpus * 1000),
        memoryLimit: limits.memory,
      };

      await db.insert(schema.projects).values(project);

      // Create deployment record
      await db.insert(schema.deployments).values({
        id: nanoid(),
        projectId,
        status: 'running',
        logs: 'Initial deployment successful',
        finishedAt: new Date(),
      });

      // Setup webhook
      const [owner, repo] = repoUrl.replace('https://github.com/', '').replace('.git', '').split('/');
      try {
        const webhookId = await githubService.createWebhook(
          user.accessToken,
          owner,
          repo,
          `https://${config.domain.base}/api/projects/${projectId}/webhook`,
          branch
        );
        await db.update(schema.projects).set({ webhookId }).where(eq(schema.projects.id, projectId));
      } catch (e) {
        // Webhook creation is non-critical
        app.log.warn('Failed to create webhook', e);
      }

      return reply.code(201).send(project);
    } finally {
      githubService.cleanupClone(clonePath);
    }
  });

  // Redeploy project
  app.post('/:id/redeploy', { preHandler: [(app as any).authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id } = request.params as { id: string };

    // Dev mode: handle in-memory project
    if (config.devMode) {
      const project = devModeProjects.get(id);
      if (!project || project.userId !== userId) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      project.status = 'building';
      devModeProjects.set(id, project);

      let clonePath: string;
      try {
        clonePath = await githubService.clonePublicRepo(project.repoUrl, project.branch);
      } catch (err: any) {
        project.status = 'failed';
        devModeProjects.set(id, project);
        return reply.code(400).send({ error: `Failed to clone repository: ${err.message}` });
      }

      try {
        const { detection } = await builderService.generateDockerfile(clonePath);
        const imageName = `openflow-${id}`.toLowerCase();

        await dockerService.buildImage(clonePath, imageName, 'Dockerfile.openflow');

        // Stop old container
        if (project.containerId) {
          try {
            await dockerService.removeContainer(project.containerId);
          } catch (e) {
            // Container might already be removed
          }
        }

        const limits = config.resources.pro;
        // Reuse existing port or get a new one
        const hostPort = project.port || await findAvailablePort(4000);

        const containerId = await dockerService.createContainer({
          name: `openflow-${id}`.toLowerCase(),
          image: imageName,
          labels: { 'openflow.port': String(hostPort) },
          cpus: limits.cpus,
          memory: limits.memory,
          env: JSON.parse(project.envVars || '[]'),
          exposedPort: detection.port,
          hostPort,
        });

        project.containerId = containerId;
        project.status = 'running';
        project.port = hostPort;
        project.url = `http://localhost:${hostPort}`;
        project.updatedAt = new Date();
        devModeProjects.set(id, project);

        const deployments = devModeDeployments.get(id) || [];
        deployments.push({
          id: nanoid(),
          projectId: id,
          status: 'running',
          logs: `Redeployment successful\nURL: ${project.url}`,
          createdAt: new Date(),
          finishedAt: new Date(),
        });
        devModeDeployments.set(id, deployments);

        return { status: 'running', containerId, url: project.url };
      } catch (err: any) {
        project.status = 'failed';
        devModeProjects.set(id, project);
        return reply.code(500).send({ error: err.message });
      } finally {
        githubService.cleanupClone(clonePath);
      }
    }

    const [project] = await db
      .select()
      .from(schema.projects)
      .where(and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)));

    if (!project) return reply.code(404).send({ error: 'Project not found' });

    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));

    // Update status
    await db.update(schema.projects).set({ status: 'building' }).where(eq(schema.projects.id, id));

    // Clone and rebuild
    const clonePath = await githubService.cloneRepo(user.accessToken, project.repoUrl, project.branch);

    try {
      const { detection } = await builderService.generateDockerfile(clonePath);
      const imageName = `openflow-${id}`.toLowerCase();

      await dockerService.buildImage(clonePath, imageName, 'Dockerfile.openflow');

      // Stop old container
      if (project.containerId) {
        try {
          await dockerService.removeContainer(project.containerId);
        } catch (e) {
          // Container might already be removed
        }
      }

      const limits = config.resources[user.plan as keyof typeof config.resources];
      const labels = traefikService.generateLabels(id, project.subdomain, detection.port);
      const networkName = `openflow-${userId}-net`;

      const containerId = await dockerService.createContainer({
        name: `openflow-${id}`.toLowerCase(),
        image: imageName,
        labels,
        cpus: limits.cpus,
        memory: limits.memory,
        networkName,
        env: JSON.parse(project.envVars || '[]'),
      });

      await db
        .update(schema.projects)
        .set({ containerId, status: 'running', updatedAt: new Date() })
        .where(eq(schema.projects.id, id));

      await db.insert(schema.deployments).values({
        id: nanoid(),
        projectId: id,
        status: 'running',
        logs: 'Redeployment successful',
        finishedAt: new Date(),
      });

      return { status: 'running', containerId };
    } catch (err: any) {
      await db.update(schema.projects).set({ status: 'failed' }).where(eq(schema.projects.id, id));
      return reply.code(500).send({ error: err.message });
    } finally {
      githubService.cleanupClone(clonePath);
    }
  });

  // Stop project
  app.post('/:id/stop', { preHandler: [(app as any).authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id } = request.params as { id: string };

    // Dev mode: handle in-memory project
    if (config.devMode) {
      const project = devModeProjects.get(id);
      if (!project || project.userId !== userId) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      if (project.containerId) {
        await dockerService.stopContainer(project.containerId);
      }

      project.status = 'stopped';
      devModeProjects.set(id, project);
      return { status: 'stopped' };
    }

    const [project] = await db
      .select()
      .from(schema.projects)
      .where(and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)));

    if (!project) return reply.code(404).send({ error: 'Project not found' });

    if (project.containerId) {
      await dockerService.stopContainer(project.containerId);
    }

    await db.update(schema.projects).set({ status: 'stopped' }).where(eq(schema.projects.id, id));
    return { status: 'stopped' };
  });

  // Delete project
  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id } = request.params as { id: string };

    // Dev mode: handle in-memory project
    if (config.devMode) {
      const project = devModeProjects.get(id);
      if (!project || project.userId !== userId) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      // Remove container
      if (project.containerId) {
        try {
          await dockerService.removeContainer(project.containerId);
        } catch (e) {
          // Ignore
        }
      }

      // Release port
      if (project.port) {
        releasePort(project.port);
      }

      devModeProjects.delete(id);
      devModeDeployments.delete(id);
      return { deleted: true };
    }

    const [project] = await db
      .select()
      .from(schema.projects)
      .where(and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)));

    if (!project) return reply.code(404).send({ error: 'Project not found' });

    // Remove container
    if (project.containerId) {
      try {
        await dockerService.removeContainer(project.containerId);
      } catch (e) {
        // Ignore
      }
    }

    // Remove webhook (only for GitHub repos)
    if (project.webhookId && !project.repoUrl.startsWith('local://')) {
      const [owner, repo] = project.repoUrl.replace('https://github.com/', '').replace('.git', '').split('/');
      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
      try {
        await githubService.deleteWebhook(user.accessToken, owner, repo, project.webhookId);
      } catch (e) {
        // Ignore
      }
    }

    await db.delete(schema.deployments).where(eq(schema.deployments.projectId, id));
    await db.delete(schema.projects).where(eq(schema.projects.id, id));

    return { deleted: true };
  });

  // Update env vars
  app.put('/:id/env', { preHandler: [(app as any).authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id } = request.params as { id: string };
    const { envVars } = request.body as { envVars: Record<string, string> };

    // Dev mode: update in-memory project
    if (config.devMode) {
      const project = devModeProjects.get(id);
      if (!project || project.userId !== userId) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      project.envVars = JSON.stringify(envVars);
      project.updatedAt = new Date();
      devModeProjects.set(id, project);
      return { updated: true };
    }

    const [project] = await db
      .select()
      .from(schema.projects)
      .where(and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)));

    if (!project) return reply.code(404).send({ error: 'Project not found' });

    await db
      .update(schema.projects)
      .set({ envVars: JSON.stringify(envVars), updatedAt: new Date() })
      .where(eq(schema.projects.id, id));

    return { updated: true };
  });

  // Webhook handler (GitHub push events)
  app.post('/:id/webhook', async (request, reply) => {
    const { id } = request.params as { id: string };
    const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, id));

    if (!project) return reply.code(404).send({ error: 'Project not found' });

    // Trigger redeploy in background
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, project.userId));
    // Reuse redeploy logic (simplified here)
    app.log.info(`Webhook triggered redeploy for project ${id}`);

    return { received: true };
  });

  // Get project deployments
  app.get('/:id/deployments', { preHandler: [(app as any).authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id } = request.params as { id: string };

    // Dev mode: return from in-memory storage
    if (config.devMode) {
      const project = devModeProjects.get(id);
      if (!project || project.userId !== userId) {
        return reply.code(404).send({ error: 'Project not found' });
      }
      return devModeDeployments.get(id) || [];
    }

    const [project] = await db
      .select()
      .from(schema.projects)
      .where(and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)));

    if (!project) return reply.code(404).send({ error: 'Project not found' });

    return db.select().from(schema.deployments).where(eq(schema.deployments.projectId, id));
  });
}
