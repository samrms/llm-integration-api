# ADR 008: Redis-Based Rate Limiting

## Context

The API needs rate limiting at two levels:

1. **Global:** Protect against DDoS and abuse (per IP).
2. **Per-organization:** Limit concurrent LLM requests to prevent resource exhaustion.

## Decision

### Global Rate Limiting

Use `@fastify/rate-limit` with Redis backend:

```typescript
await fastify.register(rateLimit, {
  max: 100, // 100 requests
  timeWindow: "1 minute", // per minute
});
```

This uses a sliding window algorithm via Redis. Default: 100 requests per minute per IP.

### Per-Organization Concurrency

Use Redis atomic operations (`INCR` + `EXPIRE` via pipeline) to track concurrent LLM requests:

```typescript
const concurrencyKey = `concurrency:${organizationId}`;
const current = await this.cache.incrWithTTL(concurrencyKey, 60);
if (current > this.maxConcurrent) {
  await this.cache.decr(concurrencyKey);
  throw new QuotaExceededError("Too many concurrent requests");
}
// ... process request ...
await this.cache.decr(concurrencyKey);
```

Default limit: 10 concurrent requests per organization.

### Rate Limiting for Authenticated Requests

The auth hook checks revoked tokens against Redis:

```typescript
const isRevoked = await cache.exists(`revoked:${token}`);
```

## Alternatives

- **In-memory rate limiting (e.g., `limiter`):** Doesn't work across multiple instances. Not suitable for horizontal scaling.
- **Database-based rate limiting:** Too slow for high-frequency checks (every request).
- **API Gateway (Kong, AWS API Gateway):** Adds infrastructure complexity and cost. Fine-grained control is harder.
- **Token bucket in application memory:** Per-instance only. Doesn't share state across instances.

## Consequences

- **Pro:** Shared state across all API instances (horizontal scaling).
- **Pro:** Sub-millisecond latency for rate limit checks.
- **Pro:** `incrWithTTL` is atomic (no race conditions).
- **Pro:** Redis is already in the stack for caching and token revocation.
- **Con:** Redis is a single point of failure for rate limiting. If Redis is down, rate limiting fails open (requests are allowed).
- **Con:** Global rate limit is per-IP, which may not be ideal for users behind NAT (shared IP).
