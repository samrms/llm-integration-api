# ADR 006: API Key Security (Hashing, Prefix)

## Context

API keys provide programmatic access to the gateway. They must be secure even if the database is compromised, and must support efficient lookup.

## Decision

### Key Format

```
<llive_prefix><random_suffix>
```

- **Prefix:** Configurable (default: `llm_live_`). 16 characters total including separator.
- **Suffix:** Cryptographically random (generated via `crypto.randomUUID()` or similar).

### Storage

- **Only the SHA-256 hash is stored** in the `api_keys.key_hash` column.
- The **prefix** is stored separately in `api_keys.prefix` for efficient lookup.
- The **full key is returned only once** at creation time. It cannot be retrieved again.

### Verification Flow

1. Extract prefix from the raw key (`key.substring(0, 16)`).
2. Look up the API key record by prefix (`findByPrefix()`).
3. Compute SHA-256 hash of the full raw key.
4. Compare with stored `key_hash`.
5. If match, set `organizationId` and `apiKeyScopes` on the request.

### Scoping

Each key has an `scopes` array (PostgreSQL text array). Scopes control what operations the key can perform within its organization.

## Alternatives

- **Store raw keys:** Simpler, but a database breach exposes all keys.
- **HMAC-based keys:** More complex than necessary. SHA-256 hash is sufficient for lookup verification.
- **Opaque tokens (no prefix):** Full-table scan for every lookup. Slow at scale.
- **Key-value store (Redis only):** Fast lookup but no relational context (org, scopes, expiry).

## Consequences

- **Pro:** Database breach doesn't expose raw API keys.
- **Pro:** Prefix-based lookup is O(1) with an index (vs. O(n) for hash-only lookup).
- **Pro:** Prefix enables quick identification of which key was compromised.
- **Pro:** Scopes provide fine-grained access control per key.
- **Con:** Two-step verification (prefix lookup + hash comparison) adds ~1ms overhead per authenticated request.
- **Con:** Key shown once at creation — user must save it immediately.
