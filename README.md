# OpenFlow

Self-hosted PaaS for deploying frontend, backend, and databases on your own VPS. Like Render or Railway, but under your control.

![OpenFlow](https://img.shields.io/badge/OpenFlow-Self--hosted%20PaaS-00f0ff)

## Features

- **Auto-detection** — Node.js, Python, Go, PHP detected automatically
- **Instant deploys** — Push to GitHub, deploy in seconds
- **Managed databases** — PostgreSQL, MySQL, MongoDB, Redis with one click
- **Secure by default** — SSL via Let's Encrypt, container isolation, rate limiting
- **Real-time monitoring** — CPU, memory, logs via WebSocket
- **GitHub OAuth** — Login with your GitHub account

## Tech Stack

- **API**: Fastify + TypeScript
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: PostgreSQL (platform data)
- **Containers**: Docker + dockerode
- **Proxy**: Traefik (automatic SSL, dynamic routing)

## Getting Started

### Prerequisites

- Node.js 20+
- Docker
- PostgreSQL

### Development

1. Clone the repository:
```bash
git clone https://github.com/JohnPitter/openflow.git
cd openflow
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Configure `.env`:
```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
JWT_SECRET=your_secret_key
DATABASE_URL=postgresql://user:pass@localhost:5432/openflow
```

5. Run database migrations:
```bash
cd apps/api && npx drizzle-kit push
```

6. Start development servers:
```bash
npm run dev:api   # API on port 3001
npm run dev:web   # Frontend on port 5173
```

### Production (Docker Compose)

```bash
docker compose up -d
```

This starts:
- Traefik (reverse proxy with SSL)
- API server
- Web frontend
- PostgreSQL

## VPS Setup Guide

Complete guide to deploy OpenFlow on a fresh VPS.

### Quick Install (Automated)

Run this single command on a fresh Ubuntu 22.04+ VPS:

```bash
curl -fsSL https://raw.githubusercontent.com/JohnPitter/openflow/main/scripts/setup.sh | sudo bash
```

This automatically installs Docker, Node.js, PostgreSQL, and configures everything.

To uninstall:
```bash
curl -fsSL https://raw.githubusercontent.com/JohnPitter/openflow/main/scripts/uninstall.sh | sudo bash
```

### Manual Installation

#### 1. Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 1 core | 2+ cores |
| RAM | 2 GB | 4+ GB |
| Disk | 20 GB | 50+ GB SSD |
| OS | Ubuntu 22.04+ | Ubuntu 24.04 LTS |

**Recommended VPS providers:** DigitalOcean, Hetzner, Vultr, Linode, Contabo

#### 2. Initial Server Setup

```bash
# Connect to your VPS
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install essentials
apt install -y curl git wget unzip

# Create non-root user (optional but recommended)
adduser openflow
usermod -aG sudo openflow
su - openflow
```

#### 3. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Add user to docker group
sudo usermod -aG docker $USER

# Apply group changes (or logout/login)
newgrp docker

# Verify installation
docker --version
docker compose version
```

#### 4. Install Node.js

```bash
# Install Node.js 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should be v20.x.x
npm --version
```

#### 5. Install OpenFlow

```bash
# Clone repository
git clone https://github.com/JohnPitter/openflow.git
cd openflow

# Install dependencies
npm install

# Build the application
npm run build

# Copy and configure environment
cp .env.example .env
nano .env
```

Configure your `.env`:
```env
# IMPORTANT: Set to false in production!
DEV_MODE=false

# GitHub OAuth (create at github.com/settings/developers)
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# Security - Generate strong random secrets!
JWT_SECRET=generate-64-char-random-string
WEBHOOK_SECRET=generate-another-random-string

# Database
DATABASE_URL=postgresql://openflow:your_password@localhost:5432/openflow

# Domain
BASE_DOMAIN=yourdomain.com
API_URL=https://api.yourdomain.com
WEB_URL=https://yourdomain.com
```

#### 6. Setup PostgreSQL

```bash
# Run PostgreSQL in Docker
docker run -d \
  --name openflow-postgres \
  -e POSTGRES_USER=openflow \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=openflow \
  -p 5432:5432 \
  -v openflow-pgdata:/var/lib/postgresql/data \
  --restart unless-stopped \
  postgres:16-alpine

# Run migrations
cd apps/api && npx drizzle-kit push
```

#### 7. Configure Traefik (SSL & Routing)

Create `traefik/traefik.yml`:
```yaml
api:
  dashboard: true

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

certificatesResolvers:
  letsencrypt:
    acme:
      email: your-email@example.com
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web

providers:
  docker:
    exposedByDefault: false
```

Start Traefik:
```bash
docker run -d \
  --name traefik \
  -p 80:80 -p 443:443 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v ./traefik:/etc/traefik \
  -v traefik-certs:/letsencrypt \
  --restart unless-stopped \
  traefik:v3.0
```

#### 8. Run OpenFlow with PM2

```bash
# Install PM2
sudo npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'openflow-api',
      cwd: './apps/api',
      script: 'dist/app.js',
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'openflow-web',
      cwd: './apps/web',
      script: 'npx',
      args: 'serve -s dist -l 5173',
      env: { NODE_ENV: 'production' }
    }
  ]
};
EOF

# Start services
pm2 start ecosystem.config.js

# Save PM2 config and enable startup
pm2 save
pm2 startup
```

#### 9. Configure DNS

Point your domain to your VPS IP:
```
A    yourdomain.com        → YOUR_VPS_IP
A    api.yourdomain.com    → YOUR_VPS_IP
A    *.yourdomain.com      → YOUR_VPS_IP  (for project subdomains)
```

#### 10. Verify Installation

```bash
# Check services
pm2 status

# Check health endpoint
curl http://localhost:3001/api/health/requirements

# Visit your domain
# https://yourdomain.com
```

#### Troubleshooting

```bash
# View API logs
pm2 logs openflow-api

# View Traefik logs
docker logs traefik

# Check Docker containers
docker ps -a

# Restart services
pm2 restart all
```

## Project Structure

```
openflow/
├── apps/
│   ├── api/          # Fastify backend
│   └── web/          # React frontend
├── templates/        # Dockerfile templates
├── docker-compose.yml
└── docs/plans/       # Design documents
```

## GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Homepage URL: `http://localhost:5173` (dev) or your domain
4. Set Callback URL: `http://localhost:3001/api/auth/github/callback`
5. Copy Client ID and Secret to `.env`

## License

MIT
