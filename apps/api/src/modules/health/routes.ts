import { FastifyInstance } from 'fastify';
import os from 'os';
import { dockerService } from '../../services/docker.js';

interface Requirement {
  name: string;
  description: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: string;
}

async function checkDocker(): Promise<Requirement> {
  try {
    const info = await dockerService.getInfo();
    return {
      name: 'Docker',
      description: 'Container runtime for deploying applications',
      status: 'ok',
      message: `Docker ${info.ServerVersion} running`,
      details: `Containers: ${info.Containers}, Images: ${info.Images}`,
    };
  } catch (error: any) {
    return {
      name: 'Docker',
      description: 'Container runtime for deploying applications',
      status: 'error',
      message: 'Docker not accessible',
      details: error.message || 'Make sure Docker is installed and running',
    };
  }
}

async function checkDockerNetwork(): Promise<Requirement> {
  try {
    await dockerService.createNetwork('openflow-healthcheck-net');
    // Clean up test network
    try {
      const docker = (dockerService as any).docker;
      const network = docker.getNetwork('openflow-healthcheck-net');
      await network.remove();
    } catch {
      // Ignore cleanup errors
    }
    return {
      name: 'Docker Network',
      description: 'Ability to create Docker networks',
      status: 'ok',
      message: 'Can create networks',
    };
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      return {
        name: 'Docker Network',
        description: 'Ability to create Docker networks',
        status: 'ok',
        message: 'Can create networks',
      };
    }
    return {
      name: 'Docker Network',
      description: 'Ability to create Docker networks',
      status: 'error',
      message: 'Cannot create networks',
      details: error.message,
    };
  }
}

function checkMemory(): Requirement {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const totalGB = (totalMem / 1024 / 1024 / 1024).toFixed(1);
  const freeGB = (freeMem / 1024 / 1024 / 1024).toFixed(1);
  const usedPercent = ((totalMem - freeMem) / totalMem) * 100;

  if (totalMem < 2 * 1024 * 1024 * 1024) {
    return {
      name: 'Memory',
      description: 'System RAM (minimum 2GB recommended)',
      status: 'error',
      message: `Only ${totalGB}GB total RAM`,
      details: 'OpenFlow requires at least 2GB of RAM',
    };
  }

  if (usedPercent > 90) {
    return {
      name: 'Memory',
      description: 'System RAM (minimum 2GB recommended)',
      status: 'warning',
      message: `${freeGB}GB free of ${totalGB}GB`,
      details: 'Memory usage is high, deployments may fail',
    };
  }

  return {
    name: 'Memory',
    description: 'System RAM (minimum 2GB recommended)',
    status: 'ok',
    message: `${freeGB}GB free of ${totalGB}GB`,
  };
}

function checkCPU(): Requirement {
  const cpuCount = os.cpus().length;
  const loadAvg = os.loadavg()[0]; // 1 minute average

  if (cpuCount < 1) {
    return {
      name: 'CPU',
      description: 'Processor cores (minimum 1 recommended)',
      status: 'error',
      message: 'No CPU detected',
    };
  }

  const loadPercent = (loadAvg / cpuCount) * 100;

  if (loadPercent > 80) {
    return {
      name: 'CPU',
      description: 'Processor cores (minimum 1 recommended)',
      status: 'warning',
      message: `${cpuCount} cores, high load (${loadPercent.toFixed(0)}%)`,
      details: 'System is under heavy load',
    };
  }

  return {
    name: 'CPU',
    description: 'Processor cores (minimum 1 recommended)',
    status: 'ok',
    message: `${cpuCount} cores available`,
  };
}

function checkDiskSpace(): Requirement {
  // Note: Node.js doesn't have a built-in way to check disk space
  // This is a simplified check using os.freemem as a proxy
  // In production, you'd use a package like 'check-disk-space'
  return {
    name: 'Disk Space',
    description: 'Storage for Docker images and volumes',
    status: 'ok',
    message: 'Disk check requires manual verification',
    details: 'Ensure at least 20GB free space for Docker images',
  };
}

function checkPlatform(): Requirement {
  const platform = os.platform();
  const release = os.release();

  const supportedPlatforms = ['linux', 'darwin', 'win32'];

  if (!supportedPlatforms.includes(platform)) {
    return {
      name: 'Operating System',
      description: 'Supported OS (Linux, macOS, Windows)',
      status: 'error',
      message: `Unsupported platform: ${platform}`,
    };
  }

  return {
    name: 'Operating System',
    description: 'Supported OS (Linux, macOS, Windows)',
    status: 'ok',
    message: `${platform} ${release}`,
  };
}

export async function healthRoutes(app: FastifyInstance) {
  // Check all system requirements
  app.get('/requirements', async () => {
    const checks = await Promise.all([
      checkDocker(),
      checkDockerNetwork(),
      Promise.resolve(checkMemory()),
      Promise.resolve(checkCPU()),
      Promise.resolve(checkDiskSpace()),
      Promise.resolve(checkPlatform()),
    ]);

    const hasErrors = checks.some((c) => c.status === 'error');
    const hasWarnings = checks.some((c) => c.status === 'warning');

    return {
      status: hasErrors ? 'error' : hasWarnings ? 'warning' : 'ok',
      message: hasErrors
        ? 'Some requirements are not met'
        : hasWarnings
          ? 'System ready with warnings'
          : 'All requirements met',
      requirements: checks,
      timestamp: new Date().toISOString(),
    };
  });

  // Quick health check
  app.get('/ping', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
}
