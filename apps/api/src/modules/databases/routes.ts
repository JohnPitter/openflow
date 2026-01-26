import { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { db, schema } from '../../db/index.js';
import { dockerService } from '../../services/docker.js';
import { config } from '../../config.js';

// In-memory storage for dev mode databases
export const devModeDatabases: Map<string, any> = new Map();

const DB_IMAGES: Record<string, { image: string; port: number; envKeys: { user: string; pass: string; db: string } }> = {
  postgresql: {
    image: 'postgres:16-alpine',
    port: 5432,
    envKeys: { user: 'POSTGRES_USER', pass: 'POSTGRES_PASSWORD', db: 'POSTGRES_DB' },
  },
  mysql: {
    image: 'mysql:8-debian',
    port: 3306,
    envKeys: { user: 'MYSQL_USER', pass: 'MYSQL_PASSWORD', db: 'MYSQL_DATABASE' },
  },
  mongodb: {
    image: 'mongo:7',
    port: 27017,
    envKeys: { user: 'MONGO_INITDB_ROOT_USERNAME', pass: 'MONGO_INITDB_ROOT_PASSWORD', db: 'MONGO_INITDB_DATABASE' },
  },
  redis: {
    image: 'redis:7-alpine',
    port: 6379,
    envKeys: { user: '', pass: '', db: '' },
  },
};

function generatePassword(): string {
  return crypto.randomBytes(24).toString('base64url');
}

function buildConnectionString(
  type: string,
  host: string,
  port: number,
  username: string,
  password: string,
  dbName: string
): string {
  switch (type) {
    case 'postgresql':
      return `postgresql://${username}:${password}@${host}:${port}/${dbName}`;
    case 'mysql':
      return `mysql://${username}:${password}@${host}:${port}/${dbName}`;
    case 'mongodb':
      return `mongodb://${username}:${password}@${host}:${port}/${dbName}`;
    case 'redis':
      return `redis://:${password}@${host}:${port}`;
    default:
      return '';
  }
}

export async function databaseRoutes(app: FastifyInstance) {
  // List user databases
  app.get('/', { preHandler: [(app as any).authenticate] }, async (request) => {
    const { id } = request.user as { id: string };

    // Dev mode: return from in-memory storage
    if (config.devMode) {
      return Array.from(devModeDatabases.values()).filter((db) => db.userId === id);
    }

    return db.select().from(schema.databases).where(eq(schema.databases.userId, id));
  });

  // Create database
  app.post('/', { preHandler: [(app as any).authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { type, name, projectId, username: customUsername, password: customPassword } = request.body as {
      type: string;
      name: string;
      projectId?: string;
      username?: string;
      password?: string;
    };

    if (!DB_IMAGES[type]) {
      return reply.code(400).send({ error: 'Unsupported database type' });
    }

    const dbConfig = DB_IMAGES[type];
    const dbId = nanoid();
    const dbName = name || `${type}-${dbId.slice(0, 6)}`;
    const username = customUsername?.trim() || `user_${dbId.slice(0, 8)}`;
    const password = customPassword || generatePassword();
    const networkName = `openflow-${userId}-net`;

    // Ensure network exists
    try {
      await dockerService.createNetwork(networkName);
    } catch (e: any) {
      if (!e.message?.includes('already exists')) throw e;
    }

    // Ensure image exists (pull if needed)
    await dockerService.ensureImage(dbConfig.image);

    // Build env vars
    const env: string[] = [];
    if (type !== 'redis') {
      env.push(`${dbConfig.envKeys.user}=${username}`);
      env.push(`${dbConfig.envKeys.pass}=${password}`);
      env.push(`${dbConfig.envKeys.db}=${dbName}`);
    } else {
      env.push(`REDIS_PASSWORD=${password}`);
    }

    // Create container
    const containerName = `openflow-db-${dbId}`;
    const volumeName = `openflow-db-${dbId}-data`;

    const containerId = await dockerService.createContainer({
      name: containerName,
      image: dbConfig.image,
      env,
      networkName,
      cpus: 0.25,
      memory: 256 * 1024 * 1024,
      volumes: {
        [volumeName]:
          type === 'postgresql'
            ? '/var/lib/postgresql/data'
            : type === 'mysql'
              ? '/var/lib/mysql'
              : type === 'mongodb'
                ? '/data/db'
                : '/data',
      },
      labels: {
        'openflow.db.name': dbName,
        'openflow.db.type': type,
        'openflow.db.port': String(dbConfig.port),
        'openflow.db.username': username,
        'openflow.db.password': password,
      },
    });

    const dbRecord = {
      id: dbId,
      userId,
      projectId: projectId || null,
      type: type as any,
      containerId,
      name: dbName,
      host: containerName,
      port: dbConfig.port,
      username,
      password,
      status: 'running' as const,
      createdAt: new Date(),
    };

    // Dev mode: save to in-memory storage
    if (config.devMode) {
      devModeDatabases.set(dbId, dbRecord);
    } else {
      await db.insert(schema.databases).values(dbRecord);
    }

    // Return connection info
    return reply.code(201).send({
      ...dbRecord,
      connectionString: buildConnectionString(type, containerName, dbConfig.port, username, password, dbName),
    });
  });

  // Delete database
  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id } = request.params as { id: string };

    let database: any = null;

    // Dev mode: get from in-memory storage
    if (config.devMode) {
      database = devModeDatabases.get(id);
      if (!database || database.userId !== userId) {
        return reply.code(404).send({ error: 'Database not found' });
      }

      if (database.containerId) {
        try {
          await dockerService.removeContainer(database.containerId);
        } catch (e) {
          // Ignore
        }
      }

      devModeDatabases.delete(id);
      return { deleted: true };
    }

    const [dbRecord] = await db
      .select()
      .from(schema.databases)
      .where(and(eq(schema.databases.id, id), eq(schema.databases.userId, userId)));

    if (!dbRecord) return reply.code(404).send({ error: 'Database not found' });

    if (dbRecord.containerId) {
      try {
        await dockerService.removeContainer(dbRecord.containerId);
      } catch (e) {
        // Ignore
      }
    }

    await db.delete(schema.databases).where(eq(schema.databases.id, id));
    return { deleted: true };
  });

  // Get connection string
  app.get('/:id/connection', { preHandler: [(app as any).authenticate] }, async (request, reply) => {
    const { id: userId } = request.user as { id: string };
    const { id } = request.params as { id: string };

    let database: any = null;

    // Dev mode: get from in-memory storage
    if (config.devMode) {
      database = devModeDatabases.get(id);
      if (!database || database.userId !== userId) {
        return reply.code(404).send({ error: 'Database not found' });
      }
    } else {
      const [dbRecord] = await db
        .select()
        .from(schema.databases)
        .where(and(eq(schema.databases.id, id), eq(schema.databases.userId, userId)));

      if (!dbRecord) return reply.code(404).send({ error: 'Database not found' });
      database = dbRecord;
    }

    return {
      connectionString: buildConnectionString(
        database.type,
        database.host,
        database.port,
        database.username,
        database.password,
        database.name
      ),
      host: database.host,
      port: database.port,
      username: database.username,
      password: database.password,
      database: database.name,
    };
  });
}
