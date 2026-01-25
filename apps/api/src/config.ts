import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  port: Number(process.env.API_PORT) || 3001,
  host: '0.0.0.0',

  github: {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
  },

  database: {
    url: process.env.DATABASE_URL!,
  },

  docker: {
    socket: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
  },

  domain: {
    base: process.env.BASE_DOMAIN || 'openflow.localhost',
    apiUrl: process.env.API_URL || `http://localhost:${Number(process.env.API_PORT) || 3001}`,
    webUrl: process.env.WEB_URL || `http://localhost:${Number(process.env.WEB_PORT) || 5173}`,
  },

  resources: {
    free: {
      cpus: 0.5,
      memory: 512 * 1024 * 1024, // 512MB
      disk: 1024 * 1024 * 1024, // 1GB
    },
    pro: {
      cpus: 2,
      memory: 2048 * 1024 * 1024, // 2GB
      disk: 10 * 1024 * 1024 * 1024, // 10GB
    },
  },
};
