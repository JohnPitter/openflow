# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenFlow is a self-hosted PaaS (Platform as a Service) for deploying frontend, backend, and databases. Think Render/Railway but self-hosted on your own VPS.

## Development Commands

```bash
# Install dependencies (from root)
npm install

# Development servers
npm run dev:api   # API on port 3001
npm run dev:web   # Frontend on port 5173

# Build
npm run build:api
npm run build:web

# Database migrations (from apps/api directory)
cd apps/api && npx drizzle-kit push
```

## Architecture

### Monorepo Structure
- **apps/api** - Fastify backend (TypeScript, ES modules)
- **apps/web** - React frontend (Vite, Tailwind CSS)
- **templates/** - Dockerfile templates for auto-detected languages

### API Layer (apps/api)

The API uses Fastify with modular route registration:
- Routes are in `src/modules/{feature}/routes.ts`
- Services are in `src/services/` - these handle core operations:
  - `docker.ts` - Container lifecycle via dockerode
  - `github.ts` - Repo cloning, webhooks via Octokit
  - `builder.ts` - Technology detection and Dockerfile generation
  - `traefik.ts` - Dynamic routing labels for SSL/rate limiting

Database uses Drizzle ORM with PostgreSQL. Schema is in `src/db/schema.ts` with these main tables:
- `users` - GitHub OAuth users with plan tier
- `projects` - Deployed apps with container references
- `databases` - Managed database instances
- `deployments` - Deploy history with logs
- `metrics` - Container resource usage

### Frontend Layer (apps/web)

React 19 with React Router for navigation. Key patterns:
- Auth state via `useAuth` hook storing JWT in localStorage
- API client in `src/services/api.ts` with typed methods
- WebSocket connections for real-time logs
- Protected routes wrap with `<Layout />` component

### Deploy Flow

1. User selects GitHub repo → `githubService.cloneRepo()`
2. Auto-detection → `builderService.detect()` identifies Node/Python/Go/PHP
3. Dockerfile generated from templates with `builderService.generateDockerfile()`
4. Container built → `dockerService.buildImage()`
5. Container started with Traefik labels → `dockerService.createContainer()`
6. Traefik picks up labels for routing/SSL automatically

### Configuration

Environment variables loaded via `src/config.ts` from root `.env`:
- `DEV_MODE=true` enables mock GitHub auth for local development
- Resource limits defined per plan tier (free/pro) in config

### Container Management

All managed containers are labeled with `openflow.managed=true` for identification. Docker socket is mounted (Linux: `/var/run/docker.sock`, Windows: `//./pipe/docker_engine`).

## Key Files

- `apps/api/src/app.ts` - API entry point, route registration
- `apps/api/src/config.ts` - Environment config with plan resource limits
- `apps/api/src/db/schema.ts` - Database schema (Drizzle)
- `apps/web/src/App.tsx` - Route definitions, auth guards
- `templates/*.Dockerfile` - Language-specific Dockerfile templates
