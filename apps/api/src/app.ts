import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import { config } from './config.js';
import { authRoutes } from './modules/auth/routes.js';
import { projectRoutes, devModeProjects } from './modules/projects/routes.js';
import { databaseRoutes, devModeDatabases } from './modules/databases/routes.js';
import { adminRoutes } from './modules/admin/routes.js';
import { metricsRoutes } from './modules/metrics/routes.js';
import { settingsRoutes } from './modules/settings/routes.js';
import { healthRoutes } from './modules/health/routes.js';
import { websocketHandler } from './websocket/handler.js';
import { dockerService } from './services/docker.js';

const app = Fastify({ logger: true });

// Restore projects and databases from running containers on startup
async function syncContainersOnStartup() {
  if (!config.devMode) return;

  console.log('Syncing existing containers...');
  const containers = await dockerService.listManagedContainers();
  console.log(`Found ${containers.length} managed containers`);

  for (const container of containers) {
    console.log('Container:', JSON.stringify({ Names: container.Names, State: container.State, Labels: container.Labels }));
    const name = container.Names[0]?.replace(/^\//, '') || '';
    const labels = container.Labels || {};

    // Check if it's a project container (openflow-{id} but not openflow-db-)
    if (name.startsWith('openflow-') && !name.startsWith('openflow-db-')) {
      const projectId = name.replace('openflow-', '');
      const port = labels['openflow.port'] ? parseInt(labels['openflow.port']) : null;
      const status = container.State === 'running' ? 'running' : 'stopped';

      // Read project info from labels
      const projectName = labels['openflow.name'] || projectId;
      const technology = labels['openflow.technology'] || 'unknown';
      const repoUrl = labels['openflow.repoUrl'] || 'unknown';
      const branch = labels['openflow.branch'] || 'main';
      const subdomain = labels['openflow.subdomain'] || projectId;

      // Only add if not already in memory
      if (!devModeProjects.has(projectId)) {
        devModeProjects.set(projectId, {
          id: projectId,
          userId: 'dev-user-001',
          name: projectName,
          repoUrl,
          branch,
          technology,
          containerId: container.Id,
          status,
          subdomain,
          url: port ? `http://localhost:${port}` : null,
          port,
          envVars: '{}',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`  Restored project: ${projectName} (${technology}, ${status})`);
      }
    }

    // Check if it's a database container (openflow-db-{id})
    if (name.startsWith('openflow-db-')) {
      const dbId = name.replace('openflow-db-', '');
      const status = container.State === 'running' ? 'running' : 'stopped';
      const image = container.Image || '';

      // Read database info from labels (if available)
      const dbName = labels['openflow.db.name'] || dbId;
      const dbType = labels['openflow.db.type'];
      const dbPort = labels['openflow.db.port'] ? parseInt(labels['openflow.db.port']) : undefined;
      const dbUsername = labels['openflow.db.username'];
      const dbPassword = labels['openflow.db.password'];

      // Fallback: detect database type from image if not in labels
      let type = dbType || 'unknown';
      if (type === 'unknown') {
        if (image.includes('postgres')) type = 'postgresql';
        else if (image.includes('mysql')) type = 'mysql';
        else if (image.includes('mongo')) type = 'mongodb';
        else if (image.includes('redis')) type = 'redis';
      }

      // Only add if not already in memory
      if (!devModeDatabases.has(dbId)) {
        devModeDatabases.set(dbId, {
          id: dbId,
          userId: 'dev-user-001',
          type,
          containerId: container.Id,
          name: dbName,
          host: name,
          port: dbPort,
          username: dbUsername,
          password: dbPassword,
          status,
          createdAt: new Date(),
        });
        console.log(`  Restored database: ${dbName} (${type}, ${status})`);
      }
    }
  }

  console.log(`Sync complete: ${devModeProjects.size} projects, ${devModeDatabases.size} databases`);
}

async function start() {
  await app.register(cors, { origin: true, credentials: true });
  await app.register(jwt, { secret: config.jwt.secret });
  await app.register(websocket);

  // Auth middleware decorator
  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // Routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(projectRoutes, { prefix: '/api/projects' });
  await app.register(databaseRoutes, { prefix: '/api/databases' });
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.register(metricsRoutes, { prefix: '/api/metrics' });
  await app.register(settingsRoutes, { prefix: '/api/settings' });
  await app.register(healthRoutes, { prefix: '/api/health' });
  await app.register(websocketHandler, { prefix: '/ws' });

  // Health check
  app.get('/api/health', async () => ({ status: 'ok' }));

  // Sync existing containers before starting
  await syncContainersOnStartup();

  await app.listen({ port: config.port, host: config.host });
  console.log(`OpenFlow API running on port ${config.port}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
