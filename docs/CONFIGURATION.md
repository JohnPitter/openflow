# Configuration

All configuration options for OpenFlow.

---

## Environment Variables

### Core Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `DEV_MODE` | Enable development mode with mock GitHub auth | `true` |
| `JWT_SECRET` | Secret key for JWT token signing | Required |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `WEBHOOK_SECRET` | Secret for GitHub webhook verification | Required in production |

### GitHub OAuth

| Variable | Description | Default |
|----------|-------------|---------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | Required |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret | Required |

### Domain and URLs (Production)

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_DOMAIN` | Base domain for project subdomains | - |
| `API_URL` | Full URL for the API server | `http://localhost:3001` |
| `WEB_URL` | Full URL for the web frontend | `http://localhost:5173` |

---

## Development Configuration

For local development, create a `.env` file in the project root:

```env
DEV_MODE=true
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
JWT_SECRET=any-development-secret
DATABASE_URL=postgresql://user:pass@localhost:5432/openflow
```

When `DEV_MODE=true`, the application uses a mock GitHub authentication flow with a test user. No real GitHub OAuth setup is needed for development.

---

## Production Configuration

```env
DEV_MODE=false
GITHUB_CLIENT_ID=your_production_client_id
GITHUB_CLIENT_SECRET=your_production_client_secret
JWT_SECRET=generate-64-char-random-string
WEBHOOK_SECRET=generate-another-random-string
DATABASE_URL=postgresql://openflow:strong_password@localhost:5432/openflow
BASE_DOMAIN=yourdomain.com
API_URL=https://api.yourdomain.com
WEB_URL=https://yourdomain.com
```

---

## Resource Limits

Resource limits are defined per plan tier in the API configuration:

| Plan | CPU | Memory | Storage | Containers |
|------|-----|--------|---------|------------|
| Free | 0.5 core | 512 MB | 1 GB | 3 |
| Pro | 2 cores | 2 GB | 10 GB | 10 |

---

## Docker Socket

The Docker socket path varies by platform:

| Platform | Path |
|----------|------|
| Linux/macOS | `/var/run/docker.sock` |
| Windows | `//./pipe/docker_engine` |

---

## DNS Configuration

For production, configure your DNS records:

```
A    yourdomain.com        -> YOUR_VPS_IP
A    api.yourdomain.com    -> YOUR_VPS_IP
A    *.yourdomain.com      -> YOUR_VPS_IP  (for project subdomains)
```

The wildcard record is required for project subdomains to work automatically.
