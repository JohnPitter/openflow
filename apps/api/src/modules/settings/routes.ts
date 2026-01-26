import { FastifyInstance } from 'fastify';
import { config } from '../../config.js';

// In-memory storage for global env vars (dev mode)
export const globalEnvVars: Map<string, string> = new Map();

export async function settingsRoutes(app: FastifyInstance) {
  // Get all global environment variables
  app.get('/env', { preHandler: [(app as any).authenticate] }, async (request) => {
    const { isAdmin } = request.user as { isAdmin: boolean };

    // Only admins can view global env vars
    if (!isAdmin) {
      return { envVars: {} };
    }

    // Convert Map to object
    const envObject: Record<string, string> = {};
    globalEnvVars.forEach((value, key) => {
      envObject[key] = value;
    });

    return { envVars: envObject };
  });

  // Update global environment variables (admin only)
  app.put('/env', { preHandler: [(app as any).authenticate] }, async (request, reply) => {
    const { isAdmin } = request.user as { isAdmin: boolean };

    if (!isAdmin) {
      return reply.code(403).send({ error: 'Only admins can manage global environment variables' });
    }

    const { envVars } = request.body as { envVars: Record<string, string> };

    // Clear existing and set new
    globalEnvVars.clear();
    Object.entries(envVars).forEach(([key, value]) => {
      if (key.trim()) {
        globalEnvVars.set(key.trim(), value);
      }
    });

    return { updated: true, count: globalEnvVars.size };
  });

  // Get global env vars as array (for internal use when creating containers)
  app.get('/env/array', { preHandler: [(app as any).authenticate] }, async () => {
    const envArray: string[] = [];
    globalEnvVars.forEach((value, key) => {
      envArray.push(`${key}=${value}`);
    });
    return { env: envArray };
  });
}

// Helper function to get global env vars as array (for use in other modules)
export function getGlobalEnvArray(): string[] {
  const envArray: string[] = [];
  globalEnvVars.forEach((value, key) => {
    envArray.push(`${key}=${value}`);
  });
  return envArray;
}
