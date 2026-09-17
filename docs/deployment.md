# Deployment

## Docker Build

```bash
# Build the image
docker build -t llm-integration-api .

# Run the container
docker run -p 3000:3000 --env-file .env llm-integration-api
```

## Docker Compose

The project includes a `docker-compose.yml` with three services:

```bash
# Start all services
docker compose up -d

# Start only infrastructure (API runs locally)
docker compose up -d postgres redis

# View logs
docker compose logs -f api

# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v
```

### Services

| Service    | Image                   | Port | Health Check                           |
| ---------- | ----------------------- | ---- | -------------------------------------- |
| `api`      | Built from `Dockerfile` | 3000 | `curl -f http://localhost:3000/health` |
| `postgres` | `postgres:16-alpine`    | 5432 | `pg_isready -U llm_user -d llm_api`    |
| `redis`    | `redis:7-alpine`        | 6379 | `redis-cli ping`                       |

### Default Credentials (docker-compose.yml)

| Service    | User       | Password   | Database  |
| ---------- | ---------- | ---------- | --------- |
| PostgreSQL | `llm_user` | `changeme` | `llm_api` |

> **Important:** Change these defaults before deploying to production.

## Environment Variables

Create a `.env` file in the project root. See the [Configuration section in README.md](../README.md#configuration) for the full list.

Minimum required for production:

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/dbname
REDIS_URL=redis://host:6379
JWT_SECRET=<at-least-32-random-characters>
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Database Migrations

```bash
# Generate migration files from schema changes
bun run db:generate

# Apply pending migrations
bun run db:migrate

# Push schema directly (development only)
bun run db:push

# Open Drizzle Studio (visual DB browser)
bun run db:studio
```

Migrations are stored in `src/infrastructure/database/migrations/`.

## Health Checks

### Liveness: `GET /health`

Returns immediately with `{"status": "ok"}`. Use for container liveness probes.

### Readiness: `GET /health/ready`

Performs active checks against:

- **PostgreSQL** — Executes `SELECT 1` via the connection pool
- **Redis** — Executes `PING`

Returns 200 with `{"status": "ok"}` if all checks pass, or 503 with `{"status": "degraded"}` if any check fails. Includes per-service latency measurements.

## Render Deployment

### Setup

1. Create a new **Web Service** on Render.
2. Connect your Git repository.
3. Configure:
   - **Runtime:** Docker
   - **Dockerfile Path:** `Dockerfile`
   - **Port:** 3000
4. Add environment variables in the Render dashboard.
5. For the database, use Render's managed PostgreSQL or an external provider.
6. For Redis, use Render's managed Redis or an external provider (e.g., Upstash).

### Render-Specific Notes

- Set `NODE_ENV=production`.
- Use Render's managed PostgreSQL for `DATABASE_URL`.
- Use Render's managed Redis for `REDIS_URL`.
- Health check URL: `https://your-service.onrender.com/health/ready`.
- Set the start command if not using Docker: `bun run start`.

## Production Checklist

- [ ] **Secrets** — All secrets are in environment variables, not in code or `.env` files in the repo
- [ ] **JWT_SECRET** — At least 32 characters, cryptographically random
- [ ] **Database** — PostgreSQL 16+ with connection pooling configured
- [ ] **Redis** — Redis 7+ with persistence configured if needed
- [ ] **CORS** — `CORS_ORIGINS` set to your actual frontend domain(s)
- [ ] **Rate Limiting** — Adjust `@fastify/rate-limit` defaults for your traffic patterns
- [ ] **LLM API Keys** — `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY` configured
- [ ] **Logging** — `LOG_LEVEL` set to `info` or `warn` (not `debug` or `trace`)
- [ ] **Body Size** — `MAX_BODY_SIZE` appropriate for your use case
- [ ] **Timeouts** — `COMPLETION_TIMEOUT_MS` and `STREAMING_TIMEOUT_MS` tuned for your LLM providers
- [ ] **Concurrency** — `MAX_CONCURRENT_LLM_REQUESTS` appropriate for your infrastructure
- [ ] **Health Checks** — Configure liveness (`/health`) and readiness (`/health/ready`) probes in your orchestrator
- [ ] **Graceful Shutdown** — The application handles `SIGINT` and `SIGTERM` for clean shutdown
- [ ] **Database Migrations** — Run `bun run db:migrate` before deploying schema changes
- [ ] **Monitoring** — Set up alerts on 5xx error rates and p99 latency
- [ ] **Backups** — Regular PostgreSQL backups configured
