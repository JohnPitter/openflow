import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { dockerService } from '../services/docker.js';

export async function websocketHandler(app: FastifyInstance) {
  app.get('/logs/:projectId', { websocket: true }, async (socket, request) => {
    const { projectId } = request.params as { projectId: string };

    // Verify auth via query param token
    const url = new URL(request.url, 'http://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      socket.close(4001, 'Unauthorized');
      return;
    }

    let userId: string;
    try {
      const decoded = app.jwt.verify<{ id: string }>(token);
      userId = decoded.id;
    } catch {
      socket.close(4001, 'Invalid token');
      return;
    }

    // Verify project ownership
    const [project] = await db
      .select()
      .from(schema.projects)
      .where(and(eq(schema.projects.id, projectId), eq(schema.projects.userId, userId)));

    if (!project || !project.containerId) {
      socket.close(4004, 'Project not found');
      return;
    }

    // Stream logs
    let streaming = true;
    const streamLogs = async () => {
      let lastLog = '';
      while (streaming) {
        try {
          const logs = await dockerService.getContainerLogs(project.containerId!, 20);
          if (logs !== lastLog) {
            lastLog = logs;
            socket.send(JSON.stringify({ type: 'logs', data: logs }));
          }

          // Also send stats
          const stats = await dockerService.getContainerStats(project.containerId!);
          socket.send(JSON.stringify({ type: 'stats', data: stats }));
        } catch {
          socket.send(JSON.stringify({ type: 'error', data: 'Container unavailable' }));
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    };

    streamLogs();

    socket.on('close', () => {
      streaming = false;
    });
  });
}
