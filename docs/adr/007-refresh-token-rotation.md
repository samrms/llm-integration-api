# ADR 007: Refresh Token Rotation with Reuse Detection

## Context

Access tokens expire quickly (15 minutes). Refresh tokens allow clients to obtain new access tokens without re-authenticating. We need to detect if a refresh token is stolen and reused.

## Decision

### Token Generation

- Refresh tokens are UUIDv4 values (`crypto.randomUUID()`).
- Stored as SHA-256 hashes in the `refresh_tokens` table.
- Each token belongs to a **token family** (a string identifier per sign-in session).

### Rotation Flow

1. Client sends a refresh token to `POST /api/v1/auth/refresh`.
2. Server verifies the token hash exists and is not revoked.
3. Server **revokes** the current refresh token (`revokedAt = now`).
4. Server creates a **new** refresh token in the **same family**.
5. Server returns new access + refresh tokens.

### Reuse Detection

1. If a **revoked** refresh token is presented (hash found but `revokedAt` is set):
   - **Revoke ALL tokens in the same family.**
   - Return 401 — the client must re-authenticate.

This means: if an attacker steals a refresh token and uses it after the legitimate user has already rotated it, the entire family is invalidated.

## Alternatives

- **No rotation:** Refresh tokens are long-lived. Simpler, but a stolen token grants persistent access.
- **Rotation without family tracking:** Each refresh creates a new token but there's no way to detect reuse of old tokens.
- **Short-lived refresh tokens (no rotation):** Forces re-authentication frequently. Bad UX.
- **Opaque server-side sessions:** More control, but requires server-side session store and doesn't work well with stateless APIs.

## Consequences

- **Pro:** Stolen refresh tokens are detected and neutralized on first reuse.
- **Pro:** Legitimate users are only affected if the attacker acts first — their next refresh attempt will revoke the family.
- **Pro:** Token family is a simple string — no complex state machine.
- **Con:** Legitimate users on multiple devices may be logged out if one device's token is compromised.
- **Con:** Requires a database lookup per refresh (hash comparison).
- **Con:** Token family must be cleaned up periodically (expired tokens with `revokedAt` set).
