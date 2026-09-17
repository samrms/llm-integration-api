# Performance Considerations

## Benchmark Methodology

### What to Measure

1. **Request latency (p50, p95, p99)** — Time from request receipt to response sent, excluding LLM provider latency.
2. **Throughput (requests/second)** — Sustained capacity under concurrent load.
3. **LLM provider latency** — Time spent waiting for OpenAI/Anthropic responses (external, not controllable).
4. **Database query latency** — Time per repository call.
5. **Redis operation latency** — Time per cache/rate-limit operation.
6. **Memory usage** — RSS and heap over time under load.
7. **Error rate** — 4xx and 5xx responses under load.

### Tools

```bash
# Install a load testing tool
bunx autocannon http://localhost:3000/health --duration 10 --connections 50

# Or use wrk
wrk -t4 -c100 -d10s http://localhost:3000/health
```

### Methodology

1. **Warm up:** Run 1000 requests before collecting metrics.
2. **Sustained load:** Run for 30-60 seconds at expected production traffic levels.
3. **Ramp up:** Gradually increase connections to find the breaking point.
4. **Isolate:** Measure API overhead separately from LLM latency.

## Latency Separation

The API's job is to authenticate, validate, route, and proxy. LLM provider calls are the dominant latency factor.

### Expected Latency Budget

| Component                             | Target (p95)        |
| ------------------------------------- | ------------------- |
| Fastify routing + validation          | < 1ms               |
| Auth hook (JWT verify)                | < 2ms               |
| Auth hook (API key lookup + hash)     | < 5ms               |
| Organization membership check         | < 5ms               |
| Database write (usage log)            | < 10ms              |
| Redis operations (concurrency, cache) | < 2ms               |
| **Total API overhead**                | **< 25ms**          |
| LLM provider (OpenAI/Anthropic)       | 500ms - 5000ms+     |
| **Total end-to-end**                  | **500ms - 5000ms+** |

### How to Measure API Overhead

To measure only the API's contribution (excluding LLM latency):

1. **Mock the LLM provider:** Use `MockLLMProvider` (already available in `src/infrastructure/llm/MockLLMProvider.ts`) with a configurable delay.
2. **Instrument the use case:** Add timing around the LLM call vs. everything else.
3. **Use the health endpoint:** `/health` and `/health/ready` have no LLM dependency — measure baseline Fastify overhead there.

## Connection Pooling

### PostgreSQL

The `PostgreSQLConnection` class creates a `pg.Pool` with:

| Setting                   | Value  | Notes                                 |
| ------------------------- | ------ | ------------------------------------- |
| `max`                     | 20     | Maximum connections in the pool       |
| `idleTimeoutMillis`       | 30,000 | Connections idle for 30s are released |
| `connectionTimeoutMillis` | 10,000 | Timeout when acquiring a connection   |

**Tuning guidance:**

- **Low traffic (< 100 req/s):** `max: 10` is sufficient.
- **Medium traffic (100-500 req/s):** `max: 20` (current default).
- **High traffic (500+ req/s):** Consider `max: 50` and PgBouncer in front of PostgreSQL.
- Monitor `pg_stat_activity` for connection utilization.

### Redis

ioredis manages its own connection pool (single connection by default, which is fine for most workloads).

- `maxRetriesPerRequest: 3` prevents infinite retry loops.
- `retryStrategy` backs off exponentially up to 5 seconds.

## Rate Limiting Impact

### Global Rate Limiting

`@fastify/rate-limit` is configured at 100 requests/minute per IP. This adds negligible overhead (Redis INCR + EXPIRE).

### Per-Organization Concurrency

The `CompletionUseCase` uses Redis `INCR` + `EXPIRE` to track concurrent LLM requests per organization:

```
concurrency:<orgId> → counter (TTL: 60s)
```

- **Overhead:** ~1ms per completion request (two Redis round-trips).
- **Impact:** Prevents a single organization from overwhelming the system with parallel LLM calls.
- **Default limit:** 10 concurrent requests per organization (`MAX_CONCURRENT_LLM_REQUESTS`).

### Idempotency

Idempotency key lookup uses PostgreSQL with a unique index:

```sql
CREATE UNIQUE INDEX uidx_idempotency_keys_key_org ON idempotency_keys(key, organization_id)
```

- **Overhead:** One INSERT/SELECT per idempotent request (~5ms).
- **Impact:** Prevents duplicate LLM calls on network retries.
- **TTL:** Idempotency records expire after 1 hour.

## Scaling Considerations

### Horizontal Scaling

- The API is stateless (JWT tokens are self-contained, Redis is external). Multiple instances can run behind a load balancer.
- PostgreSQL and Redis are the shared state — ensure they're properly sized.

### Vertical Scaling

- Bun is single-threaded per process. For CPU-bound work, consider `cluster` mode or multiple Bun processes.
- The main bottleneck is I/O (LLM provider calls, database queries), not CPU.

### Database Scaling

- Read replicas for read-heavy workloads (conversations, usage queries).
- Connection pooling via PgBouncer for high-concurrency scenarios.
- Partitioning `llm_requests` by `created_at` if the table grows large.

### Redis Scaling

- Redis Cluster for horizontal scaling if rate limiting or caching becomes a bottleneck.
- For most deployments, a single Redis instance handles 100K+ operations/second.
