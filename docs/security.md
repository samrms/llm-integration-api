# Security

## Authentication Mechanisms

### JWT (Bearer Tokens)

- **Signing algorithm:** HS256 (HMAC-SHA256)
- **Library:** jose (standards-compliant JWT implementation)
- **Token contents:** `sub` (user ID), `email`, `iat`, `exp`, optional `iss`/`aud`
- **Default expiry:** 15 minutes (`JWT_EXPIRES_IN`)
- **Storage:** Client-side only (no server-side session store)
- **Revocation:** Checked against Redis cache (`revoked:<token>` key). On logout, the token hash is added to Redis with a TTL matching the token's remaining lifetime.
- **Secret:** Minimum 32 characters, validated at startup via Zod.

### API Keys

- **Prefix:** Configurable (default: `llm_live_`). The first 16 characters (prefix) are used for database lookup.
- **Hashing:** Full key is hashed with SHA-256 before storage. The raw key is returned only once at creation time.
- **Scoping:** Each key is bound to an organization and can have granular `scopes` (array of strings).
- **Expiry:** Optional `expiresAt` timestamp.
- **Revocation:** Soft-delete via `revokedAt` timestamp.
- **Last used tracking:** `lastUsedAt` is updated asynchronously on each use (fire-and-forget, failures are silently ignored to avoid impacting request latency).

### Password Hashing

- **Algorithm:** Argon2id (via the `argon2` library)
- **Parameters:** Configurable via environment variables:
  - `ARGON2_TIME_COST` (default: 3)
  - `ARGON2_MEMORY_COST` (default: 65536 bytes = 64 MB)
  - `ARGON2_PARALLELISM` (default: 4)

## Authorization Model (RBAC)

### Organization Roles

| Role       | Permissions                                                               |
| ---------- | ------------------------------------------------------------------------- |
| **OWNER**  | Full control: manage members, create/revoke API keys, delete organization |
| **ADMIN**  | Manage members, create/revoke API keys                                    |
| **MEMBER** | Use completions, manage conversations, view usage                         |

### Role Hierarchy

```
OWNER > ADMIN > MEMBER
```

The `hasMinimumRole()` method on `OrganizationMember` implements role comparison.

### Authorization Hooks

- **`requireRole(minimumRole)`** — Verifies the authenticated user has at least the specified role in the target organization.
- **`requireOwnership()`** — Shortcut for `requireRole(OWNER)`.
- **`requireAdminOrOwner()`** — Shortcut for `requireRole(ADMIN)`.

### Organization Membership Verification

The `createOrganizationAuthHook` verifies:

1. The request has an `organizationId` (from URL params or API key).
2. If authenticated via API key, the key's organization matches.
3. If authenticated via JWT, the user is a member of the organization.

## API Key Security

- Keys are generated with a configurable prefix and a cryptographically random suffix.
- The full key is shown once at creation and never stored — only the SHA-256 hash is persisted.
- Lookup is by prefix (first 16 chars), then the full key hash is compared.
- Keys can be scoped to limit what operations they can perform.
- The `lastUsedAt` field is updated asynchronously after successful authentication.

## JWT Configuration

| Setting       | Value      | Source                                 |
| ------------- | ---------- | -------------------------------------- |
| Algorithm     | HS256      | Hardcoded                              |
| Expiry        | 15 minutes | `JWT_EXPIRES_IN`                       |
| Secret length | ≥ 32 chars | `JWT_SECRET` (validated at startup)    |
| Issuer        | Optional   | `issuer` option in `JWTTokenService`   |
| Audience      | Optional   | `audience` option in `JWTTokenService` |

Refresh tokens are UUIDv4 values, hashed with SHA-256 before storage in the database.

## Rate Limiting

- **Global rate limiting:** `@fastify/rate-limit` configured at 100 requests per minute per IP.
- **Per-organization concurrency:** Redis-based counter (`concurrency:<orgId>`) limits concurrent LLM requests. Exceeding the limit returns 429.
- **Token bucket:** The rate limiter uses a sliding window approach via `@fastify/rate-limit`.

## Input Validation

All request inputs are validated using Zod v4 schemas:

- **Request bodies** — Validated against typed Zod schemas (e.g., `completionRequest`, `signupRequest`).
- **URL parameters** — UUID format validation on all `:id` and `:organizationId` params.
- **Query strings** — Type-checked with defaults (e.g., `limit`, `cursor`, `startDate`).
- **Request ID** — `X-Request-ID` header is validated to be ≤ 128 characters.

Validation errors return a 400 response with `code: "VALIDATION_ERROR"` and the Zod error details.

## SQL Injection Prevention

- **ORM layer:** All database queries go through Drizzle ORM, which uses parameterized queries.
- **No raw SQL:** The application does not construct SQL strings from user input.
- **Schema-driven:** Table and column names are defined in the schema file, not from user input.

## Secrets Management

- **Environment variables:** All secrets are loaded from environment variables via the Zod-validated `Config` schema.
- **No hardcoded secrets:** `JWT_SECRET`, API keys, and database URLs are never committed to the repository.
- **`.env` files:** Excluded from version control via `.gitignore`.
- **Startup validation:** The application fails to start if required secrets are missing or malformed (e.g., `JWT_SECRET` must be ≥ 32 characters).

## CORS Configuration

- **Origin:** Configurable via `CORS_ORIGINS` (comma-separated list). Defaults to `http://localhost:3000`.
- **Credentials:** Enabled (`credentials: true`).
- **Registration:** `@fastify/cors` plugin registered at application startup.

## Helmet Headers

- **Plugin:** `@fastify/helmet` registered at application startup.
- **Content Security Policy:** Disabled (`contentSecurityPolicy: false`) since this is a JSON API serving no HTML.
- **Other headers:** All other Helmet defaults are active (X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, etc.).

## Error Handling

The centralized error handler (`createErrorHandler`) ensures:

- **No stack traces in production:** Unhandled errors return a generic "An internal error occurred" message.
- **Structured errors:** All `AppError` subclasses return consistent `{ error: { code, message, requestId } }` responses.
- **Request ID propagation:** Every error response includes the `requestId` for correlation.
- **Logging:** Unhandled errors are logged with full stack traces at the `error` level.
