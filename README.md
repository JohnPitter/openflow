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
