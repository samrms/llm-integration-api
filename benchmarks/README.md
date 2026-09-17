# Benchmarks

## Methodology

This document describes how to measure the performance of the LLM Integration API.

### Prerequisites

- The API server running locally (`bun run dev`)
- Docker running (for PostgreSQL and Redis via `docker compose up -d postgres redis`)
- A load testing tool: [autocannon](https://github.com/mcollina/autocannon) or [wrk](https://github.com/wg/wrk)

### Install autocannon

```bash
bunx autocannon --help
```

## What to Measure

### 1. Baseline Latency (No LLM)

Measure the API's overhead without any LLM calls:

```bash
# Liveness check (no auth, no DB)
bunx autocannon http://localhost:3000/health -d 10 -c 50

# Readiness check (DB + Redis ping)
bunx autocannon http://localhost:3000/health/ready -d 10 -c 50
```

### 2. Authenticated Endpoint Latency

Measure with a valid JWT token:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq -r '.accessToken')

# List models
bunx autocannon http://localhost:3000/api/v1/models \
  -H "Authorization: Bearer $TOKEN" \
  -d 10 -c 50

# List organizations
bunx autocannon http://localhost:3000/api/v1/organizations \
  -H "Authorization: Bearer $TOKEN" \
  -d 10 -c 50
```

### 3. Completion Latency (With Mock LLM)

For realistic completion benchmarks, configure a mock LLM provider with a fixed delay:

```bash
# Using the real OpenAI API (adds provider latency)
curl -X POST http://localhost:3000/api/v1/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### 4. Streaming Latency

Measure time-to-first-byte (TTFB) for streaming:

```bash
time curl -N -X POST http://localhost:3000/api/v1/completions/stream \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Write a haiku"}]
  }'
```

### 5. Concurrent Load

```bash
# 100 concurrent connections for 30 seconds
bunx autocannon http://localhost:3000/health \
  -d 30 -c 100

# With POST body
bunx autocannon -m POST http://localhost:3000/api/v1/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -b '{"model":"gpt-4","messages":[{"role":"user","content":"Hello"}]}' \
  -d 30 -c 20
```

## Metrics to Record

| Metric         | How to Measure              | Target                         |
| -------------- | --------------------------- | ------------------------------ |
| p50 latency    | autocannon output           | < 5ms (API overhead)           |
| p95 latency    | autocannon output           | < 25ms (API overhead)          |
| p99 latency    | autocannon output           | < 50ms (API overhead)          |
| Throughput     | requests/second             | > 1000 req/s (health endpoint) |
| Error rate     | 4xx + 5xx responses         | < 0.1%                         |
| Memory (RSS)   | `ps aux` or `bun --inspect` | Stable under load              |
| DB connections | `pg_stat_activity`          | < 20 active                    |

## Latency Breakdown

When reporting results, separate:

1. **Framework overhead** — Fastify routing, serialization (< 1ms)
2. **Validation overhead** — Zod schema validation (< 1ms)
3. **Auth overhead** — JWT verify or API key lookup (< 5ms)
4. **Database overhead** — Query execution (< 10ms)
5. **Redis overhead** — Cache/rate-limit operations (< 2ms)
6. **LLM provider latency** — External, not controllable (500ms - 5s+)

## Reporting

When sharing benchmark results, include:

- Hardware specs (CPU, RAM)
- Bun version
- PostgreSQL version and connection pool settings
- Redis version
- Number of concurrent connections
- Duration of the test
- Whether the database was warm or cold
