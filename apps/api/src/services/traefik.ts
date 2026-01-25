import { config } from '../config.js';

export interface TraefikLabels {
  [key: string]: string;
}

export const traefikService = {
  generateLabels(projectName: string, subdomain: string, port: number, customDomain?: string): TraefikLabels {
    const serviceName = `openflow-${projectName}`;
    const host = `${subdomain}.${config.domain.base}`;

    const labels: TraefikLabels = {
      'traefik.enable': 'true',
      [`traefik.http.routers.${serviceName}.rule`]: customDomain
        ? `Host(\`${host}\`) || Host(\`${customDomain}\`)`
        : `Host(\`${host}\`)`,
      [`traefik.http.routers.${serviceName}.entrypoints`]: 'websecure',
      [`traefik.http.routers.${serviceName}.tls.certresolver`]: 'letsencrypt',
      [`traefik.http.services.${serviceName}.loadbalancer.server.port`]: String(port),

      // Security middlewares
      [`traefik.http.routers.${serviceName}.middlewares`]: `${serviceName}-ratelimit,${serviceName}-headers`,

      // Rate limiting: 100 requests per second average, burst 200
      [`traefik.http.middlewares.${serviceName}-ratelimit.ratelimit.average`]: '100',
      [`traefik.http.middlewares.${serviceName}-ratelimit.ratelimit.burst`]: '200',
      [`traefik.http.middlewares.${serviceName}-ratelimit.ratelimit.period`]: '1s',

      // Security headers
      [`traefik.http.middlewares.${serviceName}-headers.headers.frameDeny`]: 'true',
      [`traefik.http.middlewares.${serviceName}-headers.headers.stsSeconds`]: '31536000',
      [`traefik.http.middlewares.${serviceName}-headers.headers.stsIncludeSubdomains`]: 'true',
      [`traefik.http.middlewares.${serviceName}-headers.headers.contentTypeNosniff`]: 'true',
      [`traefik.http.middlewares.${serviceName}-headers.headers.browserXssFilter`]: 'true',
    };

    return labels;
  },

  generateNetworkLabels(networkName: string): TraefikLabels {
    return {
      [`traefik.docker.network`]: networkName,
    };
  },
};
