import { describe, it, expect, beforeEach } from 'bun:test'
import { SigninUseCase } from '../../../../src/application/auth/SigninUseCase.js'
import {
  createMockUserRepo,
  createMockRefreshTokenRepo,
  createMockTokenService,
  createMockHasher,
} from '../../mocks.js'
import { User } from '../../../../src/domain/entities/User.js'

describe('SigninUseCase', () => {
  let userRepo: ReturnType<typeof createMockUserRepo>
  let refreshTokenRepo: ReturnType<typeof createMockRefreshTokenRepo>
  let tokenService: ReturnType<typeof createMockTokenService>
  let hasher: ReturnType<typeof createMockHasher>
  let useCase: SigninUseCase

  beforeEach(() => {
    userRepo = createMockUserRepo()
    refreshTokenRepo = createMockRefreshTokenRepo()
    tokenService = createMockTokenService()
    hasher = createMockHasher()
    useCase = new SigninUseCase(
      userRepo,
      refreshTokenRepo,
      tokenService,
      hasher,
      7,
    )
  })

  async function createTestUser(
    email = 'alice@example.com',
    password = 'password123',
  ) {
    const passwordHash = await hasher.hash(password)
    return userRepo.create({ email, passwordHash, name: 'Alice' })
  }

  it('returns accessToken and refreshToken on successful signin', async () => {
    await createTestUser()

    const result = await useCase.execute({
      email: 'alice@example.com',
      password: 'password123',
    })

    expect(result.accessToken).toStrictEqual(expect.any(String))
    expect(result.refreshToken).toStrictEqual(expect.any(String))
    expect(result.user).toBeDefined()
    expect(result.user.email).toBe('alice@example.com')
  })

  it('stores refresh token in the repository', async () => {
    const user = await createTestUser()

    await useCase.execute({
      email: 'alice@example.com',
      password: 'password123',
    })

    // Should have one refresh token stored
    const stored = [...refreshTokenRepo._store.values()]
    expect(stored.length).toBe(1)
    expect(stored[0]!.userId).toBe(user.id)
    expect(stored[0]!.family).toStrictEqual(expect.any(String))
    expect(stored[0]!.expiresAt).toBeInstanceOf(Date)
    expect(stored[0]!.revokedAt).toBeNull()
  })

  it('normalizes email to lowercase before lookup', async () => {
    await createTestUser('bob@example.com')

    const result = await useCase.execute({
      email: 'BOB@EXAMPLE.COM',
      password: 'password123',
    })

    expect(result.user.email).toBe('bob@example.com')
  })

  it('throws AuthenticationError for non-existent email', async () => {
    await expect(
      useCase.execute({
        email: 'nobody@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow('Invalid email or password')
  })

  it('throws AuthenticationError for wrong password', async () => {
    await createTestUser('alice@example.com', 'correct-password')

    await expect(
      useCase.execute({
        email: 'alice@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toThrow('Invalid email or password')
  })

  it('does not reveal whether email or password was wrong', async () => {
    // Non-existent email
    const err1 = await useCase
      .execute({ email: 'nope@example.com', password: 'pass' })
      .catch((e) => e)

    // Existing email, wrong password
    await createTestUser('exists@example.com', 'realpass')
    const err2 = await useCase
      .execute({ email: 'exists@example.com', password: 'wrongpass' })
      .catch((e) => e)

    expect(err1.message).toBe(err2.message)
  })

  it('generates different tokens for different signin attempts', async () => {
    await createTestUser()

    const result1 = await useCase.execute({
      email: 'alice@example.com',
      password: 'password123',
    })
    const result2 = await useCase.execute({
      email: 'alice@example.com',
      password: 'password123',
    })

    // Access tokens should differ (counter increments)
    expect(result1.accessToken).not.toBe(result2.accessToken)
    expect(result1.refreshToken).not.toBe(result2.refreshToken)
  })
})
