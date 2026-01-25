import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../db/index.js';
import { dockerService } from '../../services/docker.js';

export async function adminRoutes(app: FastifyInstance) {
  // Admin middleware
  const adminGuard = async (request: any, reply: any) => {
    await (app as any).authenticate(request, reply);
    if (!request.user?.isAdmin) {
      reply.code(403).send({ error: 'Forbidden' });
    }
  };

  // Overview: global stats
  app.get('/overview', { preHandler: [adminGuard] }, async () => {
    const allProjects = await db.select().from(schema.projects);
    const running = allProjects.filter((p) => p.status === 'running').length;
    const stopped = allProjects.filter((p) => p.status === 'stopped').length;
    const building = allProjects.filter((p) => p.status === 'building').length;
    const failed = allProjects.filter((p) => p.status === 'failed').length;

    let systemResources = { cpuCount: 0, totalMemory: 0, usedMemory: 0 };
    try {
      systemResources = await dockerService.getSystemResources();
    } catch (e) {
      // Docker might not be available in dev
    }

    return {
      projects: { total: allProjects.length, running, stopped, building, failed },
      system: systemResources,
    };
  });

  // List all containers (privacy-safe: only tech + resources)
  app.get('/containers', { preHandler: [adminGuard] }, async () => {
    const projects = await db
      .select({
        id: schema.projects.id,
        technology: schema.projects.technology,
        status: schema.projects.status,
        containerId: schema.projects.containerId,
        cpuLimit: schema.projects.cpuLimit,
        memoryLimit: schema.projects.memoryLimit,
        createdAt: schema.projects.createdAt,
      })
      .from(schema.projects);

    const containersWithStats = await Promise.all(
      projects.map(async (project) => {
        let stats = null;
        if (project.containerId && project.status === 'running') {
          try {
            stats = await dockerService.getContainerStats(project.containerId);
          } catch (e) {
            // Container might be unavailable
          }
        }

        return {
          id: project.id,
          technology: project.technology,
          status: project.status,
          cpuLimit: project.cpuLimit,
          memoryLimit: project.memoryLimit,
          currentStats: stats,
          createdAt: project.createdAt,
        };
      })
    );

    return containersWithStats;
  });

  // Get alerts
  app.get('/alerts', { preHandler: [adminGuard] }, async () => {
    const projects = await db.select().from(schema.projects);
    const alerts: { type: string; message: string; projectId: string }[] = [];

    for (const project of projects) {
      if (project.status === 'failed') {
        alerts.push({
          type: 'error',
          message: `Project using ${project.technology} is in failed state`,
          projectId: project.id,
        });
      }

      if (project.containerId && project.status === 'running') {
        try {
          const stats = await dockerService.getContainerStats(project.containerId);
          if (stats.memoryUsage / stats.memoryLimit > 0.9) {
            alerts.push({
              type: 'warning',
              message: `Container using ${project.technology} is at ${Math.round((stats.memoryUsage / stats.memoryLimit) * 100)}% memory`,
              projectId: project.id,
            });
          }
        } catch (e) {
          // Skip
        }
      }
    }

    return alerts;
  });

  // User count (no details)
  app.get('/users/count', { preHandler: [adminGuard] }, async () => {
    const users = await db.select({ id: schema.users.id }).from(schema.users);
    return { count: users.length };
  });
}
