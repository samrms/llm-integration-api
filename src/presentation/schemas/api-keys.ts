import { z } from 'zod'

// ---------------------------------------------------------------------------
// Create API Key
// ---------------------------------------------------------------------------
export const createAPIKeyRequest = z.object({
  name: z.string().min(1).max(255),
  scopes: z
    .array(
      z.enum([
        'completions:write',
        'conversations:read',
        'conversations:write',
        'usage:read',
        'models:read',
      ]),
    )
    .min(1),
  expiresAt: z.string().datetime().optional(),
})

export const createAPIKeyResponse = z.object({
  apiKey: z.string(),
  apiKeyRecord: z.object({
    id: z.string().uuid(),
    organizationId: z.string().uuid(),
    name: z.string(),
    prefix: z.string(),
    scopes: z.array(z.string()),
    expiresAt: z.string().datetime().nullable(),
    revokedAt: z.string().datetime().nullable(),
    lastUsedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
})

// ---------------------------------------------------------------------------
// List API Keys
// ---------------------------------------------------------------------------
export const listAPIKeysResponse = z.array(
  z.object({
    id: z.string().uuid(),
    organizationId: z.string().uuid(),
    name: z.string(),
    prefix: z.string(),
    scopes: z.array(z.string()),
    expiresAt: z.string().datetime().nullable(),
    revokedAt: z.string().datetime().nullable(),
    lastUsedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
)

// ---------------------------------------------------------------------------
// Revoke API Key
// ---------------------------------------------------------------------------
export const revokeAPIKeyRequest = z.object({
  id: z.string().uuid(),
})

export type CreateAPIKeyRequest = z.infer<typeof createAPIKeyRequest>
export type CreateAPIKeyResponse = z.infer<typeof createAPIKeyResponse>
export type RevokeAPIKeyRequest = z.infer<typeof revokeAPIKeyRequest>
