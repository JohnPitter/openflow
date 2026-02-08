# Getting Started

Quick start guide for OpenFlow development.

---

## Prerequisites

- Node.js 20+
- Docker
- PostgreSQL

---

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/JohnPitter/openflow.git
cd openflow
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
JWT_SECRET=your_secret_key
DATABASE_URL=postgresql://user:pass@localhost:5432/openflow
```

> **Tip:** Set `DEV_MODE=true` to enable mock GitHub auth with a test user (no GitHub OAuth needed during development).

### 4. Database Migrations

```bash
cd apps/api && npx drizzle-kit push
```

### 5. Start Development Servers

```bash
npm run dev:api   # API on port 3001
npm run dev:web   # Frontend on port 5173
```

---

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both API and Web concurrently |
| `npm run dev:api` | API only (port 3001) |
| `npm run dev:web` | Frontend only (port 5173) |
| `npm run build` | Build all workspaces |
| `npm run build:api` | Build API only |
| `npm run build:web` | Build frontend only |
| `npm run preview -w apps/web` | Preview production build |

---

## Project Structure

```
openflow/
├── apps/
│   ├── api/          # Fastify backend (TypeScript, ES modules)
│   └── web/          # React frontend (Vite, Tailwind CSS)
├── templates/        # Dockerfile templates for auto-detected languages
├── docker-compose.yml
└── docs/
```

---

## Docker Compose (Production)

```bash
docker compose up -d
```

This starts:
- Traefik (reverse proxy with SSL)
- API server
- Web frontend
- PostgreSQL

---

## GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Homepage URL: `http://localhost:5173` (dev) or your domain
4. Set Callback URL: `http://localhost:3001/api/auth/github/callback`
5. Copy Client ID and Secret to `.env`

---

## Health Check

After starting the API, verify system readiness:

```bash
curl http://localhost:3001/api/health/requirements
```

The frontend redirects to `/requirements` after login to verify the system before accessing the dashboard.
