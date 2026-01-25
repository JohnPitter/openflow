import Docker from 'dockerode';
import { config } from '../config.js';

const docker = new Docker({ socketPath: config.docker.socket });

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
}

export interface ContainerStats {
  cpuPercent: number;
  memoryUsage: number;
  memoryLimit: number;
  networkRx: number;
  networkTx: number;
}

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
    const container = await docker.createContainer({
      name: cfg.name,
      Image: cfg.image,
      Env: cfg.env || [],
      Labels: {
        'openflow.managed': 'true',
        ...cfg.labels,
      },
      HostConfig: {
        NanoCpus: (cfg.cpus || 0.5) * 1e9,
        Memory: cfg.memory || 512 * 1024 * 1024,
        RestartPolicy: { Name: 'unless-stopped' },
        NetworkMode: cfg.networkName,
        Binds: cfg.volumes
          ? Object.entries(cfg.volumes).map(([host, container]) => `${host}:${container}`)
          : undefined,
      },
      ExposedPorts: cfg.ports
        ? Object.fromEntries(Object.keys(cfg.ports).map((p) => [p, {}]))
        : undefined,
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
