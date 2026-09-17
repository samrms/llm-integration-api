import { describe, it, expect } from 'bun:test'
import { APIKey, APIKeyScope } from '../../../../src/domain/entities/APIKey.js'

describe('APIKey entity', () => {
  const validProps = {
    organizationId: 'org-123',
    name: 'Production Key',
    prefix: 'llm_live_',
    keyHash: 'argon2_hashed_key_here',
    scopes: [APIKeyScope.COMPLETIONS_WRITE, APIKeyScope.CONVERSATIONS_READ],
  }

  describe('create()', () => {
    it('creates an API key with valid props', () => {
      const key = APIKey.create(validProps)

      expect(key.organizationId).toBe('org-123')
      expect(key.name).toBe('Production Key')
      expect(key.prefix).toBe('llm_live_')
      expect(key.keyHash).toBe('argon2_hashed_key_here')
      expect(key.scopes).toEqual([
        APIKeyScope.COMPLETIONS_WRITE,
        APIKeyScope.CONVERSATIONS_READ,
      ])
      expect(key.expiresAt).toBeNull()
      expect(key.revokedAt).toBeNull()
      expect(key.lastUsedAt).toBeNull()
      expect(key.id).toStrictEqual(expect.any(String))
    })

    it('creates a key with expiration date', () => {
      const expires = new Date('2025-12-31T23:59:59Z')
      const key = APIKey.create({
        ...validProps,
        expiresAt: expires,
      })

      expect(key.expiresAt).toBe(expires)
    })

    it('throws on empty name', () => {
      expect(() => APIKey.create({ ...validProps, name: '' })).toThrow(
        'API key name is required',
      )
    })

    it('throws on whitespace-only name', () => {
      expect(() => APIKey.create({ ...validProps, name: '   ' })).toThrow(
        'API key name is required',
      )
    })

    it('throws on empty scopes array', () => {
      expect(() => APIKey.create({ ...validProps, scopes: [] })).toThrow(
        'At least one scope is required',
      )
    })

    it('throws on missing organizationId', () => {
      expect(() =>
        APIKey.create({ ...validProps, organizationId: '' }),
      ).toThrow('Organization ID is required')
    })

    it('throws on missing keyHash', () => {
      expect(() => APIKey.create({ ...validProps, keyHash: '' })).toThrow(
        'Key hash is required',
      )
    })

    it('copies scopes array (defensive copy)', () => {
      const scopes = [APIKeyScope.MODELS_READ]
      const key = APIKey.create({ ...validProps, scopes })
      scopes.push(APIKeyScope.USAGE_READ)

      expect(key.scopes).toEqual([APIKeyScope.MODELS_READ])
    })
  })

  describe('reconstitute()', () => {
    it('preserves all fields', () => {
      const now = new Date('2024-06-01T00:00:00Z')
      const key = APIKey.reconstitute({
        id: 'key-id-1',
        organizationId: 'org-1',
        name: 'Test Key',
        prefix: 'llm_',
        keyHash: 'hash',
        scopes: [APIKeyScope.COMPLETIONS_WRITE],
        expiresAt: now,
        revokedAt: now,
        lastUsedAt: now,
        createdAt: now,
        updatedAt: now,
      })

      expect(key.id).toBe('key-id-1')
      expect(key.expiresAt).toBe(now)
      expect(key.revokedAt).toBe(now)
      expect(key.lastUsedAt).toBe(now)
    })
  })

  describe('isActive', () => {
    it('returns true when not revoked and not expired', () => {
      const key = APIKey.create({
        ...validProps,
        expiresAt: new Date(Date.now() + 86400_000),
      })
      expect(key.isActive).toBe(true)
    })

    it('returns true when no expiration is set', () => {
      const key = APIKey.create({ ...validProps, expiresAt: undefined })
      expect(key.isActive).toBe(true)
    })

    it('returns false when revoked', () => {
      const key = APIKey.create({ ...validProps })
      key.revoke()
      expect(key.isActive).toBe(false)
    })

    it('returns false when expired', () => {
      const key = APIKey.create({
        ...validProps,
        expiresAt: new Date('2020-01-01T00:00:00Z'),
      })
      expect(key.isActive).toBe(false)
    })

    it('returns false when both revoked and expired', () => {
      const key = APIKey.create({
        ...validProps,
        expiresAt: new Date('2020-01-01T00:00:00Z'),
      })
      key.revoke()
      expect(key.isActive).toBe(false)
    })
  })

  describe('revoke()', () => {
    it('sets revokedAt to current time', () => {
      const key = APIKey.create(validProps)
      const before = Date.now()
      key.revoke()
      const after = Date.now()

      expect(key.revokedAt).not.toBeNull()
      expect(key.revokedAt!.getTime()).toBeGreaterThanOrEqual(before)
      expect(key.revokedAt!.getTime()).toBeLessThanOrEqual(after)
    })

    it('updates updatedAt', () => {
      const key = APIKey.create(validProps)
      const originalUpdatedAt = key.updatedAt
      // Small delay to ensure time difference
      key.revoke()
      expect(key.updatedAt.getTime()).toBeGreaterThanOrEqual(
        originalUpdatedAt.getTime(),
      )
    })
  })

  describe('recordUsage()', () => {
    it('sets lastUsedAt to current time', () => {
      const key = APIKey.create(validProps)
      const before = Date.now()
      key.recordUsage()
      const after = Date.now()

      expect(key.lastUsedAt).not.toBeNull()
      expect(key.lastUsedAt!.getTime()).toBeGreaterThanOrEqual(before)
      expect(key.lastUsedAt!.getTime()).toBeLessThanOrEqual(after)
    })

    it('updates updatedAt', () => {
      const key = APIKey.create(validProps)
      const originalUpdatedAt = key.updatedAt
      key.recordUsage()
      expect(key.updatedAt.getTime()).toBeGreaterThanOrEqual(
        originalUpdatedAt.getTime(),
      )
    })
  })

  describe('hasScope()', () => {
    it('returns true when scope is present', () => {
      const key = APIKey.create(validProps)
      expect(key.hasScope(APIKeyScope.COMPLETIONS_WRITE)).toBe(true)
      expect(key.hasScope(APIKeyScope.CONVERSATIONS_READ)).toBe(true)
    })

    it('returns false when scope is absent', () => {
      const key = APIKey.create(validProps)
      expect(key.hasScope(APIKeyScope.USAGE_READ)).toBe(false)
      expect(key.hasScope(APIKeyScope.CONVERSATIONS_WRITE)).toBe(false)
    })

    it('works with all scope types', () => {
      const allScopes = Object.values(APIKeyScope)
      const key = APIKey.create({ ...validProps, scopes: allScopes })

      for (const scope of allScopes) {
        expect(key.hasScope(scope)).toBe(true)
      }
    })
  })
})
