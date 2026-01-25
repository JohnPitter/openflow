# OpenFlow — Design Document

## Overview

OpenFlow is a self-hosted PaaS (Platform as a Service) that runs on a single VPS, providing a Render/Railway-like experience. Users authenticate via GitHub, select a repository, and OpenFlow automatically builds and deploys it.

## Architecture

### Stack

- **API**: Fastify (TypeScript)
- **Frontend**: React + Vite
- **Platform DB**: PostgreSQL
- **Containerization**: Docker (programmatic via dockerode)
- **Reverse Proxy**: Traefik (automatic SSL, dynamic routing)
- **Auth**: GitHub OAuth

### Layers

1. **API Server** — Manages users, projects, deployments, resources. WebSocket for real-time logs.
2. **Frontend Dashboard** — User and admin interfaces.
3. **Traefik** — Routes requests to containers, handles SSL, security middlewares.
4. **Docker Engine** — Runs user projects in isolated containers with resource limits.

## Deploy Flow

1. User selects a GitHub repository
2. API clones the repo via GitHub token
3. Auto-detection of technology:
   - `package.json` → Node.js (React, Next.js, Vite, Express, etc.)
   - `requirements.txt` / `pyproject.toml` → Python
   - `go.mod` → Go
   - `Dockerfile` → Uses user's Dockerfile directly
   - `composer.json` → PHP
4. Build — Generates optimized Dockerfile from internal templates or uses user's Dockerfile
5. Deploy — Creates container with resource limits, connects to internal network, configures Traefik labels
6. Project accessible at `<project-name>.openflow.<domain>`

### Automatic Redeploy

- GitHub webhook registered on selected branch
- Push triggers new build → blue-green deployment (new container up, health check, remove old)

### Environment Variables

- Configured via dashboard
- Stored encrypted in PostgreSQL
- Injected at container runtime

## Resource Management

### Per-container Limits

- CPU: shared via `--cpus` (e.g., 0.5 CPU free plan)
- RAM: hard limit via `--memory` (e.g., 512MB free, 2GB pro)
- Disk: volumes with quota via Docker storage driver

### Monitoring

- Metrics collected via Docker Stats API (CPU%, RAM, network I/O)
- Stored as time-series in PostgreSQL (30-day retention)
- Internal alerts at 90% threshold

### Global VPS Limits

- API checks available resources before accepting new deploy
- VPS at 85%+ usage → new deploys queued
- Admin sees total consumption vs capacity

## Security & Resilience

### Attack Protection (Traefik)

- Rate limiting per IP
- Security headers (HSTS, X-Frame-Options, CSP)
- Automatic IP blocking (fail2ban integration)
- Containers have no host network access

### Resilience

- Restart policy: `unless-stopped`
- Health checks every 30s — 3 consecutive failures triggers restart
- Crash loop detection (5 restarts in 5 min) → stop + notify user
- Daily backup of user database volumes

## User Databases

### Available Types

- PostgreSQL
- MySQL
- MongoDB
- Redis

### Provisioning

- User clicks "Add Database", selects type
- API creates container with official image (e.g., `postgres:16-alpine`)
- Strong random credentials generated
- Connected to user's internal network only (no public exposure)
- Connection string injected as env var in linked projects

### Persistence

- Dedicated Docker volume per database
- Automatic daily backups (pg_dump / mongodump / mysqldump)
- 7-day backup retention
- Manual backup/export available via dashboard

### Limits

- Disk quota per database (1GB free, 10GB pro)
- One database per type per user on free plan

## Dashboards

### User Dashboard

- **Projects** — List with status (running, stopped, building, failed), tech, access URL
- **Project Detail** — Real-time logs (WebSocket), metrics (CPU, RAM), env vars, custom domain, deploy branch, manual redeploy button
- **Databases** — List with type, status, connection string, disk usage
- **Settings** — GitHub account, current plan

### Admin Dashboard

- **Overview** — Total running projects, global VPS consumption (CPU%, RAM%, disk%)
- **Container List** — Shows only: technology, status, individual consumption, uptime. No project name, no repo, no env vars (user privacy).
- **Alerts** — Crash loops, high VPS usage, queued deploys
- **Configuration** — Plan limits, base domain, Traefik settings

### Auth/Authorization

- Login via GitHub OAuth (regular users)
- Admin defined by DB flag (first registered user is admin)
- Admin routes protected by role middleware

## Project Structure

```
openflow/
├── apps/
│   ├── api/                    # Fastify Backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/       # GitHub OAuth, JWT sessions
│   │   │   │   ├── projects/   # CRUD projects, deploy, redeploy
│   │   │   │   ├── databases/  # Provision databases
│   │   │   │   ├── admin/      # Admin routes
│   │   │   │   └── metrics/    # Docker stats collection
│   │   │   ├── services/
│   │   │   │   ├── docker.ts   # dockerode wrapper
│   │   │   │   ├── github.ts   # Clone, webhooks
│   │   │   │   ├── builder.ts  # Detection + build
│   │   │   │   └── traefik.ts  # Dynamic labels
│   │   │   ├── websocket/      # Real-time logs
│   │   │   └── app.ts
│   │   └── package.json
│   └── web/                    # React + Vite Frontend
│       ├── src/
│       │   ├── pages/
│       │   │   ├── Dashboard/
│       │   │   ├── ProjectDetail/
│       │   │   ├── Admin/
│       │   │   └── Login/
│       │   ├── components/
│       │   ├── hooks/
│       │   └── services/       # API client
│       └── package.json
├── templates/                  # Dockerfiles per technology
│   ├── node.Dockerfile
│   ├── python.Dockerfile
│   ├── go.Dockerfile
│   └── php.Dockerfile
├── docker-compose.yml          # Platform infra (API, web, postgres, traefik)
├── package.json                # Monorepo workspaces
└── tsconfig.base.json
```

Monorepo with npm workspaces.
