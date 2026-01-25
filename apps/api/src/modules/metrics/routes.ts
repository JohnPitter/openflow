import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '../../db/index.js';
import { dockerService } from '../../services/docker.js';

export async function metricsRoutes(app: FastifyInstance) {
  // Get metrics for a project
  app.get('/:projectId', { preHandler: [(app as any).authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { projectId } = request.params as { projectId: string };

    const [project] = await db
      .select()
      .from(schema.projects)
      .where(and(eq(schema.projects.id, projectId), eq(schema.projects.userId, userId)));

    if (!project) return reply.code(404).send({ error: 'Project not found' });

    if (!project.containerId || project.status !== 'running') {
      return { current: null, history: [] };
    }

    let current = null;
    try {
      current = await dockerService.getContainerStats(project.containerId);
    } catch (e) {
      // Container unavailable
    }

    const history = await db
      .select()
      .from(schema.metrics)
      .where(eq(schema.metrics.containerId, project.containerId));

    return { current, history };
  });

  // Get logs for a project
  app.get('/:projectId/logs', { preHandler: [(app as any).authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { projectId } = request.params as { projectId: string };
    const { tail } = request.query as { tail?: string };

    const [project] = await db
      .select()
      .from(schema.projects)
      .where(and(eq(schema.projects.id, projectId), eq(schema.projects.userId, userId)));

    if (!project) return reply.code(404).send({ error: 'Project not found' });

    if (!project.containerId) {
      return { logs: '' };
    }

    try {
      const logs = await dockerService.getContainerLogs(project.containerId, Number(tail) || 100);
      return { logs };
    } catch (e) {
      return { logs: '' };
    }
  });
}
