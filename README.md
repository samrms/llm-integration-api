# LLM Integration API

A production-ready, multi-tenant LLM gateway REST API that provides a unified interface to multiple LLM providers (OpenAI, Anthropic) with organization-based access control, API key management, conversation tracking, and usage monitoring.

## Features

- **Multi-tenant architecture** — Organization-based isolation with role-based access control (Owner, Admin, Member)
- **LLM provider abstraction** — Unified API for OpenAI and Anthropic with streaming support (SSE)
- **JWT + API key authentication** — Dual auth: Bearer tokens for user sessions, API keys for programmatic access
- **Refresh token rotation** — Token family tracking with reuse detection
- **Conversation management** — Create, list, get, and delete conversations with message history
- **Usage tracking** — Per-organization token usage and latency metrics
- **Idempotency** — Request-level idempotency keys for safe retries
- **Concurrency control** — Per-organization concurrent request limits via Redis
- **Rate limiting** — Global rate limiting via `@fastify/rate-limit`
- **Input validation** — Zod v4 schema validation on all endpoints
- **Structured logging** — Pino-based logging with request/response serializers
- **OpenAPI docs** — Swagger UI at `/docs`

## Tech Stack

| Component             | Technology     |
| --------------------- | -------------- |
| Runtime               | Bun            |
| HTTP Framework        | Fastify 5      |
| ORM                   | Drizzle ORM    |
| Database              | PostgreSQL 16  |
| Cache / Rate Limiting | Redis 7        |
| Auth (JWT)            | jose           |
| Auth (Password)       | argon2         |
| Validation            | Zod v4         |
| Language              | TypeScript 5.9 |

## Prerequisites

- [Bun](https://bun.sh/) v1.0+
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose (for local PostgreSQL and Redis)
- PostgreSQL 16+ (if running outside Docker)
- Redis 7+ (if running outside Docker)

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd llm-integration-api

# Start infrastructure
docker compose up -d postgres redis

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration (see Configuration below)

# Run database migrations
bun run db:migrate

# Start the development server
bun run dev
```

The API is now available at `http://localhost:3000`.

## Development Setup

```bash
# Install dependencies
bun install

# Start infrastructure services
docker compose up -d postgres redis

# Configure environment
cp .env.example .env
# Required: DATABASE_URL, JWT_SECRET, REDIS_URL

# Run database migrations
bun run db:push          # Push schema directly (dev)
bun run db:migrate       # Run pending migrations (prod)
bun run db:studio        # Open Drizzle Studio

# Start dev server (with hot reload)
bun run dev

# Type check
bun run typecheck

# Lint
bun run lint
bun run lint:fix

# Format
bun run format
bun run format:check
```

## API Endpoints

### Health

| Method | Path            | Auth | Description                  |
| ------ | --------------- | ---- | ---------------------------- |
| GET    | `/health`       | No   | Liveness check               |
| GET    | `/health/ready` | No   | Readiness check (DB + Redis) |

### Authentication

| Method | Path                   | Auth   | Description              |
| ------ | ---------------------- | ------ | ------------------------ |
| POST   | `/api/v1/auth/signup`  | No     | Create account           |
| POST   | `/api/v1/auth/signin`  | No     | Sign in                  |
| POST   | `/api/v1/auth/refresh` | No     | Refresh access token     |
| POST   | `/api/v1/auth/logout`  | Bearer | Sign out                 |
| GET    | `/api/v1/users/me`     | Bearer | Get current user profile |

### Organizations

| Method | Path                                                    | Auth         | Description               |
| ------ | ------------------------------------------------------- | ------------ | ------------------------- |
| POST   | `/api/v1/organizations`                                 | Bearer       | Create organization       |
| GET    | `/api/v1/organizations`                                 | Bearer       | List user's organizations |
| POST   | `/api/v1/organizations/:organizationId/members`         | Bearer + Org | Add member                |
| DELETE | `/api/v1/organizations/:organizationId/members/:userId` | Bearer + Org | Remove member             |

### API Keys

| Method | Path                                                 | Auth         | Description    |
| ------ | ---------------------------------------------------- | ------------ | -------------- |
| POST   | `/api/v1/organizations/:organizationId/api-keys`     | Bearer + Org | Create API key |
| GET    | `/api/v1/organizations/:organizationId/api-keys`     | Bearer + Org | List API keys  |
| DELETE | `/api/v1/organizations/:organizationId/api-keys/:id` | Bearer + Org | Revoke API key |

### Models

| Method | Path             | Auth             | Description           |
| ------ | ---------------- | ---------------- | --------------------- |
| GET    | `/api/v1/models` | Bearer / API Key | List available models |

### Completions

| Method | Path                         | Auth             | Description                  |
| ------ | ---------------------------- | ---------------- | ---------------------------- |
| POST   | `/api/v1/completions`        | Bearer / API Key | Create chat completion       |
| POST   | `/api/v1/completions/stream` | Bearer / API Key | Stream chat completion (SSE) |

### Conversations

| Method | Path                                                               | Auth         | Description         |
| ------ | ------------------------------------------------------------------ | ------------ | ------------------- |
| POST   | `/api/v1/organizations/:organizationId/conversations`              | Bearer + Org | Create conversation |
| GET    | `/api/v1/organizations/:organizationId/conversations`              | Bearer + Org | List conversations  |
| GET    | `/api/v1/organizations/:organizationId/conversations/:id`          | Bearer + Org | Get conversation    |
| DELETE | `/api/v1/organizations/:organizationId/conversations/:id`          | Bearer + Org | Delete conversation |
| GET    | `/api/v1/organizations/:organizationId/conversations/:id/messages` | Bearer + Org | List messages       |
| POST   | `/api/v1/organizations/:organizationId/conversations/:id/messages` | Bearer + Org | Send message        |

### Usage

| Method | Path                                          | Auth         | Description       |
| ------ | --------------------------------------------- | ------------ | ----------------- |
| GET    | `/api/v1/organizations/:organizationId/usage` | Bearer + Org | Get usage records |

## Authentication

### JWT (Bearer Tokens)

Used for user session authentication. Include the token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Access tokens expire after the configured `JWT_EXPIRES_IN` (default: 15 minutes). Use the refresh token endpoint to obtain new access tokens.

Refresh tokens are single-use with family-based rotation. If a revoked token is reused, all tokens in that family are revoked (token theft detection).

### API Keys

Used for programmatic access. Include the key in the `X-Api-Key` header:

```
X-Api-Key: llm_live_<key_suffix>
```

API keys are scoped to an organization and can have granular permissions via `scopes`. Keys are identified by their prefix for efficient lookup and verified by SHA-256 hash. Only the prefix is stored in the response when creating a key; the full key is shown once and cannot be retrieved again.

## Configuration

### Environment Variables

| Variable                        | Required | Default                  | Description                               |
| ------------------------------- | -------- | ------------------------ | ----------------------------------------- |
| `NODE_ENV`                      | No       | `development`            | `development`, `production`, or `test`    |
| `PORT`                          | No       | `3000`                   | Server port                               |
| `DATABASE_URL`                  | **Yes**  | —                        | PostgreSQL connection URL                 |
| `REDIS_URL`                     | No       | `redis://localhost:6379` | Redis connection URL                      |
| `JWT_SECRET`                    | **Yes**  | —                        | Secret key for JWT signing (min 32 chars) |
| `JWT_EXPIRES_IN`                | No       | `15m`                    | Access token lifetime (e.g., `15m`, `1h`) |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS` | No       | `7`                      | Refresh token lifetime in days            |
| `OPENAI_API_KEY`                | No       | —                        | OpenAI API key                            |
| `ANTHROPIC_API_KEY`             | No       | —                        | Anthropic API key                         |
| `CORS_ORIGINS`                  | No       | `http://localhost:3000`  | Comma-separated allowed origins           |
| `LOG_LEVEL`                     | No       | `info`                   | Pino log level                            |
| `ARGON2_TIME_COST`              | No       | `3`                      | Argon2 time cost                          |
| `ARGON2_MEMORY_COST`            | No       | `65536`                  | Argon2 memory cost (bytes)                |
| `ARGON2_PARALLELISM`            | No       | `4`                      | Argon2 parallelism                        |
| `COMPLETION_TIMEOUT_MS`         | No       | `60000`                  | LLM request timeout                       |
| `STREAMING_TIMEOUT_MS`          | No       | `120000`                 | Streaming request timeout                 |
| `MAX_CONCURRENT_LLM_REQUESTS`   | No       | `10`                     | Max concurrent LLM requests per org       |
| `MAX_BODY_SIZE`                 | No       | `1mb`                    | Max request body size                     |
| `API_KEY_PREFIX`                | No       | `llm_live_`              | Prefix for generated API keys             |

## Testing

```bash
# Run all tests
bun test

# Run specific test suites
bun run test:unit
bun run test:integration
bun run test:security
bun run test:e2e
bun run test:contract
```

## Architecture

```
src/
├── index.ts                          # Entry point
├── app/
│   ├── Application.ts                # Fastify app setup (CORS, Helmet, Rate Limit)
│   ├── Container.ts                  # Manual dependency injection container
│   └── Router.ts                     # Route registration
├── config/
│   └── Config.ts                     # Zod-validated environment configuration
├── domain/
│   ├── entities/                     # Domain entities (User, Organization, etc.)
│   ├── errors/                       # Typed error hierarchy (AppError)
│   └── ports/                        # Repository/service interfaces
├── application/
│   ├── auth/                         # Signup, Signin, Refresh, Logout, GetProfile
│   ├── organizations/                # Create, List, AddMember, RemoveMember
│   ├── api-keys/                     # Create, List, Revoke
│   ├── models/                       # ListModels
│   ├── completions/                  # Completion, StreamingCompletion
│   ├── conversations/                # CRUD + SendMessage
│   └── usage/                        # GetUsage
├── infrastructure/
│   ├── auth/                         # JWTTokenService, Argon2PasswordHasher
│   ├── database/                     # PostgreSQLConnection, schema, migrations
│   ├── redis/                        # RedisClient, CacheService
│   ├── llm/                          # OpenAIProvider, AnthropicProvider
│   └── repositories/                 # Drizzle-based repository implementations
└── presentation/
    ├── controllers/                  # HTTP request/response handling
    ├── hooks/                        # Auth, authorization, requestId, errorHandler
    ├── routes/                       # Route definitions per domain
    └── schemas/                      # Zod validation schemas
```

The architecture follows Clean Architecture principles with clear separation between domain, application, infrastructure, and presentation layers. Dependencies flow inward — domain has no external dependencies.

## License

MIT
