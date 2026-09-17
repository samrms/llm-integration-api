# Threat Model

## Assets

| Asset                       | Sensitivity | Description                                       |
| --------------------------- | ----------- | ------------------------------------------------- |
| **User credentials**        | Critical    | Email + Argon2 password hashes                    |
| **JWT secrets**             | Critical    | Signing key for access tokens                     |
| **API keys**                | Critical    | Organization-scoped programmatic access tokens    |
| **Refresh tokens**          | High        | Single-use tokens for session renewal             |
| **LLM prompts/completions** | Medium      | User-submitted prompts and AI-generated responses |
| **Organization data**       | Medium      | Org names, membership, billing metadata           |
| **Usage metrics**           | Low         | Token counts, latency, request logs               |
| **Audit logs**              | Low         | Action history for compliance                     |

## Threats and Mitigations

### T1: Credential Stuffing / Brute Force

**Threat:** Attacker attempts to guess passwords via repeated signin attempts.

**Mitigations:**

- Global rate limiting (100 req/min per IP via `@fastify/rate-limit`).
- Argon2id password hashing with configurable cost factors (memory-hard, resists GPU attacks).
- No user enumeration: signup returns conflict for existing emails, signin returns generic "Invalid credentials".

**Residual risk:** No per-account lockout mechanism. Consider adding account lockout after N failed attempts.

### T2: JWT Token Theft

**Threat:** Attacker obtains a valid JWT access token (via XSS, network interception, log exposure).

**Mitigations:**

- Short token expiry (15 minutes default).
- Token revocation on logout (stored in Redis with TTL).
- Refresh token rotation with reuse detection (token families).
- HTTPS required in production (enforced by deployment configuration).
- No tokens in URL query parameters.

**Residual risk:** Token is valid until expiry or revocation. Short TTL limits the window.

### T3: API Key Exposure

**Threat:** Attacker obtains an API key from source code, logs, or client-side exposure.

**Mitigations:**

- Keys are SHA-256 hashed before storage — database breach doesn't expose raw keys.
- Key prefix enables quick identification of which key was compromised.
- Optional expiry dates on keys.
- Soft revocation (`revokedAt`) without data deletion.
- `lastUsedAt` tracking for detecting unauthorized use.
- Keys shown once at creation; full key never stored or logged.

**Residual risk:** Key is valid until revoked. No automatic expiration by default.

### T4: Refresh Token Reuse (Token Theft)

**Threat:** Attacker steals a refresh token and uses it to obtain new access tokens.

**Mitigations:**

- Refresh tokens are single-use (UUIDv4, stored as SHA-256 hash).
- Token family tracking: each rotation creates a new token in the same family.
- **Reuse detection:** If a revoked token is presented, all tokens in that family are revoked. This limits the attacker's window to the time between theft and first use.

### T5: SQL Injection

**Threat:** Attacker injects SQL via request parameters.

**Mitigations:**

- All database queries use Drizzle ORM with parameterized queries.
- No raw SQL construction from user input.
- Zod validation on all inputs before they reach the database layer.

### T6: Cross-Tenant Data Access

**Threat:** User accesses data belonging to another organization.

**Mitigations:**

- Every organization-scoped query includes `organizationId` in the WHERE clause.
- Auth hooks verify organization membership before processing requests.
- API keys are bound to a specific organization.
- Unique constraints on (`organizationId`, `userId`) prevent duplicate memberships.

### T7: Denial of Service (DoS)

**Threat:** Attacker floods the API with requests.

**Mitigations:**

- Global rate limiting (100 req/min per IP).
- Per-organization concurrency limits on LLM requests.
- Request body size limit (1MB default via `bodyLimit`).
- Request ID length validation (max 128 chars).
- Connection pool limits on PostgreSQL (max 20 connections).

### T8: LLM Prompt Injection

**Threat:** User submits prompts designed to manipulate the LLM's behavior.

**Mitigations:**

- The API acts as a pass-through — prompt sanitization is the caller's responsibility.
- Request validation ensures message format is correct (role + content).
- Rate limiting prevents abuse at the API level.

**Note:** This is a known limitation of any LLM gateway. Full prompt injection prevention requires application-level filtering.

### T9: Man-in-the-Middle (MitM)

**Threat:** Attacker intercepts traffic between client and API.

**Mitigations:**

- HTTPS enforced in production (deployment configuration).
- Helmet headers enable HSTS.
- CORS restricted to configured origins.
- API keys and JWT tokens are sensitive — HTTPS prevents interception.

### T10: Secrets Exposure in Logs

**Threat:** API keys, passwords, or tokens appear in application logs.

**Mitigations:**

- Fastify log serializers only include method, URL, hostname, remote address, and status code.
- No request body logging by default.
- Password hashes never logged.
- API key hashes never logged.

## Attack Scenarios

### Scenario 1: Compromised API Key

1. Attacker obtains an API key from a client-side application.
2. Attacker uses the key to make completions requests.
3. **Detection:** `lastUsedAt` shows usage from unexpected IP/user-agent.
4. **Response:** Organization admin revokes the key via `DELETE /api/v1/organizations/:id/api-keys/:keyId`.

### Scenario 2: Refresh Token Theft

1. Attacker steals a refresh token via XSS.
2. Attacker uses the refresh token to get a new access token.
3. Legitimate user uses their refresh token (which is now revoked).
4. **Detection:** Reuse detection revokes the entire token family.
5. **Response:** User is logged out and must re-authenticate.

### Scenario 3: Database Breach

1. Attacker gains read access to the PostgreSQL database.
2. **Exposed:** User emails, Argon2 password hashes, API key hashes, refresh token hashes.
3. **Not exposed:** Raw passwords, raw API keys, JWT secret (stored in environment, not DB).
4. **Mitigation:** Argon2 hashes resist brute-force. API key hashes can't be reversed. JWT secret is in env vars, not the database.

### Scenario 4: Redis Compromise

1. Attacker gains read access to Redis.
2. **Exposed:** Rate limit counters, revoked token hashes, concurrency counters.
3. **Not exposed:** No user data, no API keys, no passwords.
4. **Impact:** Attacker could manipulate rate limits or bypass revocation checks.
5. **Mitigation:** Redis should be password-protected and not exposed to untrusted networks.
