import Docker from 'dockerode';
import net from 'net';
import { config } from '../config.js';

// Track used ports in dev mode
const usedPorts = new Set<number>();

async function findAvailablePort(startPort: number = 4000): Promise<number> {
  let port = startPort;
  while (port < 65535) {
    if (!usedPorts.has(port)) {
      const available = await new Promise<boolean>((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => {
          server.close();
          resolve(true);
        });
        server.listen(port, '127.0.0.1');
      });
      if (available) {
        usedPorts.add(port);
        return port;
      }
    }
    port++;
  }
  throw new Error('No available ports');
}

function releasePort(port: number) {
  usedPorts.delete(port);
}

// On Windows, use named pipe; on Linux/Mac, use socket
const dockerOptions = process.platform === 'win32'
  ? { socketPath: '//./pipe/docker_engine' }
  : { socketPath: config.docker.socket };

const docker = new Docker(dockerOptions);

export interface ContainerConfig {
  name: string;
  image: string;
  env?: string[];
  labels?: Record<string, string>;
  cpus?: number;
  memory?: number;
  networkName?: string;
  volumes?: Record<string, string>;
  ports?: Record<string, string>;
  exposedPort?: number;  // Port to expose to host (dev mode)
  hostPort?: number;     // Host port to bind to
}

export interface ContainerStats {
  cpuPercent: number;
  memoryUsage: number;
  memoryLimit: number;
  networkRx: number;
  networkTx: number;
}

export { findAvailablePort, releasePort };

export const dockerService = {
  async buildImage(contextPath: string, tag: string, dockerfile?: string): Promise<string> {
    const stream = await docker.buildImage(
      { context: contextPath, src: ['.'] },
      { t: tag, dockerfile: dockerfile || 'Dockerfile' }
    );

    return new Promise((resolve, reject) => {
      docker.modem.followProgress(stream, (err: any, output: any) => {
        if (err) reject(err);
        else resolve(tag);
      });
    });
  },

  async createContainer(cfg: ContainerConfig): Promise<string> {
    // Build port bindings for dev mode
    const portBindings: Record<string, { HostPort: string }[]> = {};
    const exposedPorts: Record<string, {}> = {};

    if (cfg.exposedPort && cfg.hostPort) {
      const containerPort = `${cfg.exposedPort}/tcp`;
      exposedPorts[containerPort] = {};
      portBindings[containerPort] = [{ HostPort: String(cfg.hostPort) }];
    }

    const container = await docker.createContainer({
      name: cfg.name,
      Image: cfg.image,
      Env: cfg.env || [],
      Labels: {
        'openflow.managed': 'true',
        ...cfg.labels,
      },
      ExposedPorts: Object.keys(exposedPorts).length > 0 ? exposedPorts : undefined,
      HostConfig: {
        NanoCpus: (cfg.cpus || 0.5) * 1e9,
        Memory: cfg.memory || 512 * 1024 * 1024,
        RestartPolicy: { Name: 'unless-stopped' },
        NetworkMode: cfg.networkName,
        Binds: cfg.volumes
          ? Object.entries(cfg.volumes).map(([host, container]) => `${host}:${container}`)
          : undefined,
        PortBindings: Object.keys(portBindings).length > 0 ? portBindings : undefined,
      },
      NetworkingConfig: cfg.networkName
        ? { EndpointsConfig: { [cfg.networkName]: {} } }
        : undefined,
    });

    await container.start();
    return container.id;
  },

  async stopContainer(containerId: string): Promise<void> {
    const container = docker.getContainer(containerId);
    await container.stop();
  },

  async removeContainer(containerId: string): Promise<void> {
    const container = docker.getContainer(containerId);
    await container.remove({ force: true });
  },

  async getContainerStats(containerId: string): Promise<ContainerStats> {
    const container = docker.getContainer(containerId);
    const stats = await container.stats({ stream: false });

    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100 : 0;

    const memoryUsage = stats.memory_stats.usage - (stats.memory_stats.stats?.cache || 0);

    const networks = stats.networks || {};
    let networkRx = 0;
    let networkTx = 0;
    for (const iface of Object.values(networks) as any[]) {
      networkRx += iface.rx_bytes || 0;
      networkTx += iface.tx_bytes || 0;
    }

    return {
      cpuPercent: Math.round(cpuPercent * 100) / 100,
      memoryUsage,
      memoryLimit: stats.memory_stats.limit,
      networkRx,
      networkTx,
    };
  },

  async getContainerLogs(containerId: string, tail = 100): Promise<string> {
    const container = docker.getContainer(containerId);
    const logs = await container.logs({ stdout: true, stderr: true, tail, timestamps: true });
    return logs.toString();
  },

  async createNetwork(name: string): Promise<string> {
    const network = await docker.createNetwork({ Name: name, Driver: 'bridge' });
    return network.id;
  },

  async removeNetwork(name: string): Promise<void> {
    const network = docker.getNetwork(name);
    await network.remove();
  },

  async getContainerStatus(containerId: string): Promise<string> {
    const container = docker.getContainer(containerId);
    const info = await container.inspect();
    return info.State.Status;
  },

  async listManagedContainers(): Promise<any[]> {
    return docker.listContainers({
      all: true,
      filters: { label: ['openflow.managed=true'] },
    });
  },

  async getSystemResources(): Promise<{ cpuCount: number; totalMemory: number; usedMemory: number }> {
    const info = await docker.info();
    return {
      cpuCount: info.NCPU,
      totalMemory: info.MemTotal,
      usedMemory: info.MemTotal - (info.MemTotal * (info.MemoryLimit ? 1 : 0.85)),
    };
  },

  async healthCheck(containerId: string): Promise<boolean> {
    try {
      const status = await this.getContainerStatus(containerId);
      return status === 'running';
    } catch {
      return false;
    }
  },
};
