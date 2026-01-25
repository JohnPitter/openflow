import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import { config } from './config.js';
import { authRoutes } from './modules/auth/routes.js';
import { projectRoutes } from './modules/projects/routes.js';
import { databaseRoutes } from './modules/databases/routes.js';
import { adminRoutes } from './modules/admin/routes.js';
import { metricsRoutes } from './modules/metrics/routes.js';
import { websocketHandler } from './websocket/handler.js';

const app = Fastify({ logger: true });

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
  await app.register(websocketHandler, { prefix: '/ws' });

  // Health check
  app.get('/api/health', async () => ({ status: 'ok' }));

  await app.listen({ port: config.port, host: config.host });
  console.log(`OpenFlow API running on port ${config.port}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
