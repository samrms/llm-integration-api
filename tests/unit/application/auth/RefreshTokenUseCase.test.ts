import { describe, it, expect, beforeEach } from 'bun:test'
import { RefreshTokenUseCase } from '../../../../src/application/auth/RefreshTokenUseCase.js'
import {
  createMockUserRepo,
  createMockRefreshTokenRepo,
  createMockTokenService,
  createMockHasher,
} from '../../mocks.js'

describe('RefreshTokenUseCase', () => {
  let userRepo: ReturnType<typeof createMockUserRepo>
  let refreshTokenRepo: ReturnType<typeof createMockRefreshTokenRepo>
  let tokenService: ReturnType<typeof createMockTokenService>
  let useCase: RefreshTokenUseCase

  beforeEach(() => {
    userRepo = createMockUserRepo()
    refreshTokenRepo = createMockRefreshTokenRepo()
    tokenService = createMockTokenService()
    useCase = new RefreshTokenUseCase(
      refreshTokenRepo,
      tokenService,
      userRepo,
      7,
    )
  })

  async function setupUserWithRefreshToken(
    email = 'alice@example.com',
    expiresInDays = 7,
  ) {
    const hasher = createMockHasher()
    const user = await userRepo.create({
      email,
      passwordHash: await hasher.hash('pass'),
    })

    const refreshToken = 'original_refresh_token'
    const tokenHash = await tokenService.hashToken(refreshToken)
    const family = tokenService.generateId()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    await refreshTokenRepo.create({
      userId: user.id,
      tokenHash,
      family,
      expiresAt,
    })

    return { user, refreshToken, tokenHash, family }
  }

  it('returns new token pair on successful refresh', async () => {
    const { user, refreshToken } = await setupUserWithRefreshToken()

    const result = await useCase.execute({
      refreshToken,
      userId: user.id,
    })

    expect(result.accessToken).toStrictEqual(expect.any(String))
    expect(result.refreshToken).toStrictEqual(expect.any(String))
    expect(result.refreshToken).not.toBe(refreshToken)
  })

  it('revokes old token and creates new one in same family', async () => {
    const { user, refreshToken, family } = await setupUserWithRefreshToken()

    await useCase.execute({ refreshToken, userId: user.id })

    // Old token should be revoked
    const oldHash = await tokenService.hashToken(refreshToken)
    const oldRecord = await refreshTokenRepo.findByTokenHash(oldHash)
    expect(oldRecord).not.toBeNull()
    expect(oldRecord!.revokedAt).not.toBeNull()

    // New token should exist in same family
    const allTokens = [...refreshTokenRepo._store.values()]
    const newTokens = allTokens.filter(
      (t) => t.family === family && t.revokedAt === null,
    )
    expect(newTokens.length).toBe(1)
  })

  it('throws AuthenticationError for unknown token', async () => {
    await expect(
      useCase.execute({
        refreshToken: 'nonexistent_token',
        userId: 'user-1',
      }),
    ).rejects.toThrow('Invalid refresh token')
  })

  it('revokes entire family on token reuse (reuse detection)', async () => {
    const { user, refreshToken, family } = await setupUserWithRefreshToken()

    // First use: rotate successfully
    await useCase.execute({ refreshToken, userId: user.id })

    // Second use with original (already revoked): reuse detected
    await expect(
      useCase.execute({ refreshToken, userId: user.id }),
    ).rejects.toThrow('Refresh token reuse detected')

    // All tokens in family should now be revoked
    const allTokens = [...refreshTokenRepo._store.values()]
    const familyTokens = allTokens.filter((t) => t.family === family)
    for (const token of familyTokens) {
      expect(token.revokedAt).not.toBeNull()
    }
  })

  it('throws AuthenticationError for expired token', async () => {
    const { user, refreshToken } = await setupUserWithRefreshToken(
      'expired@test.com',
      -1, // expired yesterday
    )

    await expect(
      useCase.execute({ refreshToken, userId: user.id }),
    ).rejects.toThrow('Refresh token expired')
  })

  it('revokes expired token by id before throwing', async () => {
    const { user, refreshToken, tokenHash } = await setupUserWithRefreshToken(
      'expire-revoke@test.com',
      -1,
    )

    await useCase.execute({ refreshToken, userId: user.id }).catch(() => {})

    const record = await refreshTokenRepo.findByTokenHash(tokenHash)
    expect(record).not.toBeNull()
    expect(record!.revokedAt).not.toBeNull()
  })

  it('throws AuthenticationError when user not found after rotation', async () => {
    // Create a token for a user, then delete the user
    const hasher = createMockHasher()
    const user = await userRepo.create({
      email: 'ghost@test.com',
      passwordHash: await hasher.hash('pass'),
    })

    const refreshToken = 'ghost_refresh_token'
    const tokenHash = await tokenService.hashToken(refreshToken)
    const family = tokenService.generateId()
    const expiresAt = new Date(Date.now() + 86400_000)

    await refreshTokenRepo.create({
      userId: user.id,
      tokenHash,
      family,
      expiresAt,
    })

    // Delete the user
    await userRepo.delete(user.id)

    await expect(
      useCase.execute({ refreshToken, userId: user.id }),
    ).rejects.toThrow('User not found')
  })
})
