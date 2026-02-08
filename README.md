# OpenFlow

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue?style=for-the-badge&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-20+-green?style=for-the-badge&logo=nodedotjs)
![Docker](https://img.shields.io/badge/Docker-Required-blue?style=for-the-badge&logo=docker)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

**Self-hosted PaaS for Your VPS**

*Deploy frontend, backend, and databases like Render or Railway, but under your control*

[Quick Start](#quick-start) •
[Features](#features) •
[VPS Setup](#vps-setup-guide) •
[Configuration](#configuration) •
[Documentation](#documentation)

</div>

---

## Overview

OpenFlow is a self-hosted Platform as a Service (PaaS) for deploying frontend, backend, and database applications on your own VPS. It provides auto-detection of project technologies, instant deploys from GitHub, managed databases, SSL via Let's Encrypt, and real-time monitoring -- all under your control.

**Tech Stack:**
- **API:** Fastify + TypeScript
- **Frontend:** React + Vite + Tailwind CSS
- **Database:** PostgreSQL (platform data)
- **Containers:** Docker + dockerode
- **Proxy:** Traefik (automatic SSL, dynamic routing)

---

## Features

| Feature | Description |
|---------|-------------|
| **Auto-detection** | Node.js, Python, Go, PHP detected automatically |
| **Instant Deploys** | Push to GitHub, deploy in seconds |
| **Managed Databases** | PostgreSQL, MySQL, MongoDB, Redis with one click |
| **Secure by Default** | SSL via Let's Encrypt, container isolation, rate limiting |
| **Real-time Monitoring** | CPU, memory, logs via WebSocket |
| **GitHub OAuth** | Login with your GitHub account |
| **Dynamic Routing** | Traefik-based routing with automatic SSL certificates |
| **Version Control** | Deploy history with rollback support |

---

## Quick Start

### Requirements

| Requirement | Version |
|-------------|---------|
| Node.js | 20+ |
| Docker | Latest |
| PostgreSQL | 16+ |
| npm | 9+ |

### Development

```bash
# Clone the repository
git clone https://github.com/JohnPitter/openflow.git
cd openflow

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Configure .env with your credentials
# GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, JWT_SECRET, DATABASE_URL

# Run database migrations
cd apps/api && npx drizzle-kit push

# Start development servers
npm run dev:api   # API on port 3001
npm run dev:web   # Frontend on port 5173
```

### Docker Compose

```bash
docker compose up -d
```

This starts Traefik (reverse proxy with SSL), API server, web frontend, and PostgreSQL.

---

## VPS Setup Guide

### Quick Install (Automated)

Run this single command on a fresh Ubuntu 22.04+ VPS:

```bash
curl -fsSL https://raw.githubusercontent.com/JohnPitter/openflow/main/scripts/setup.sh | sudo bash
```

To uninstall:

```bash
curl -fsSL https://raw.githubusercontent.com/JohnPitter/openflow/main/scripts/uninstall.sh | sudo bash
```

### Manual Installation

#### VPS Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 1 core | 2+ cores |
| RAM | 2 GB | 4+ GB |
| Disk | 20 GB | 50+ GB SSD |
| OS | Ubuntu 22.04+ | Ubuntu 24.04 LTS |

Recommended VPS providers: DigitalOcean, Hetzner, Vultr, Linode, Contabo.

For the complete step-by-step VPS installation guide including Docker, Node.js, PostgreSQL, Traefik, PM2, and DNS setup, see [docs/VPS_SETUP.md](docs/VPS_SETUP.md).

---

## Configuration

### Environment Variables

```env
# Development mode (enables mock GitHub auth)
DEV_MODE=true

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Security
JWT_SECRET=your_secret_key

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/openflow

# Production domain (VPS only)
BASE_DOMAIN=yourdomain.com
API_URL=https://api.yourdomain.com
WEB_URL=https://yourdomain.com
```

### DNS Configuration (Production)

```
A    yourdomain.com        -> YOUR_VPS_IP
A    api.yourdomain.com    -> YOUR_VPS_IP
A    *.yourdomain.com      -> YOUR_VPS_IP  (for project subdomains)
```

---

## Project Structure

```
openflow/
├── apps/
│   ├── api/          # Fastify backend (TypeScript)
│   └── web/          # React frontend (Vite, Tailwind)
├── templates/        # Dockerfile templates for auto-detected languages
├── docker-compose.yml
└── docs/
```

---

## GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Homepage URL: `http://localhost:5173` (dev) or your domain
4. Set Callback URL: `http://localhost:3001/api/auth/github/callback`
5. Copy Client ID and Secret to `.env`

---

## Documentation

| Document | Description |
|----------|-------------|
| [GETTING_STARTED.md](docs/GETTING_STARTED.md) | Quick start guide for development |
| [VPS_SETUP.md](docs/VPS_SETUP.md) | Complete VPS deployment guide |
| [CONFIGURATION.md](docs/CONFIGURATION.md) | All configuration options |

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

---

## Support

- **Issues:** [GitHub Issues](https://github.com/JohnPitter/openflow/issues)
- **Discussions:** [GitHub Discussions](https://github.com/JohnPitter/openflow/discussions)
