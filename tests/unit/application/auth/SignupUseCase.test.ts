import { describe, it, expect, beforeEach } from 'bun:test'
import { SignupUseCase } from '../../../../src/application/auth/SignupUseCase.js'
import {
  createMockUserRepo,
  createMockOrgRepo,
  createMockMemberRepo,
  createMockHasher,
} from '../../mocks.js'
import { UserRole } from '../../../../src/domain/entities/User.js'

describe('SignupUseCase', () => {
  let userRepo: ReturnType<typeof createMockUserRepo>
  let orgRepo: ReturnType<typeof createMockOrgRepo>
  let memberRepo: ReturnType<typeof createMockMemberRepo>
  let hasher: ReturnType<typeof createMockHasher>
  let useCase: SignupUseCase

  beforeEach(() => {
    userRepo = createMockUserRepo()
    orgRepo = createMockOrgRepo()
    memberRepo = createMockMemberRepo()
    hasher = createMockHasher()
    useCase = new SignupUseCase(userRepo, orgRepo, memberRepo, hasher)
  })

  it('creates user, organization, and membership on successful signup', async () => {
    const result = await useCase.execute({
      email: 'alice@example.com',
      password: 'securepass123',
      name: 'Alice',
    })

    // User was created
    expect(result.user).toBeDefined()
    expect(result.user.email).toBe('alice@example.com')
    expect(result.user.name).toBe('Alice')
    expect(result.user.passwordHash).toBe('hashed:securepass123')

    // Organization was created with user's name
    expect(result.organization).toBeDefined()
    expect(result.organization.name).toBe("Alice's Organization")
    expect(result.organization.ownerId).toBe(result.user.id)

    // Membership was created with OWNER role
    expect(result.membership).toBeDefined()
    expect(result.membership.role).toBe(UserRole.OWNER)
    expect(result.membership.userId).toBe(result.user.id)
    expect(result.membership.organizationId).toBe(result.organization.id)
  })

  it('persists user in the repository', async () => {
    const result = await useCase.execute({
      email: 'bob@test.com',
      password: 'password123',
    })

    const found = await userRepo.findById(result.user.id)
    expect(found).not.toBeNull()
    expect(found!.email).toBe('bob@test.com')
  })

  it('normalizes email to lowercase', async () => {
    const result = await useCase.execute({
      email: 'CAROL@EXAMPLE.COM',
      password: 'password123',
      name: 'Carol',
    })

    expect(result.user.email).toBe('carol@example.com')
    // Should be findable by lowercase
    const found = await userRepo.findByEmail('carol@example.com')
    expect(found).not.toBeNull()
  })

  it('throws ConflictError on duplicate email', async () => {
    await useCase.execute({
      email: 'dupe@example.com',
      password: 'password123',
    })

    await expect(
      useCase.execute({
        email: 'dupe@example.com',
        password: 'anotherpass456',
      }),
    ).rejects.toThrow('A user with this email already exists')
  })

  it('throws ValidationError for password too short', async () => {
    await expect(
      useCase.execute({
        email: 'short@example.com',
        password: '1234567',
      }),
    ).rejects.toThrow('Password must be at least 8 characters long')
  })

  it('throws ValidationError for empty email', async () => {
    await expect(
      useCase.execute({
        email: '',
        password: 'password123',
      }),
    ).rejects.toThrow('Email is required')
  })

  it('throws ValidationError for invalid email format', async () => {
    await expect(
      useCase.execute({
        email: 'not-an-email',
        password: 'password123',
      }),
    ).rejects.toThrow('Invalid email format')
  })

  it('hashes the password before storing', async () => {
    const result = await useCase.execute({
      email: 'hash@test.com',
      password: 'plaintext123',
    })

    // Password hash should not be the plaintext
    expect(result.user.passwordHash).not.toBe('plaintext123')
    // But should be our mock hash
    expect(result.user.passwordHash).toBe('hashed:plaintext123')
  })

  it('trims name before storing', async () => {
    const result = await useCase.execute({
      email: 'trim@test.com',
      password: 'password123',
      name: '  Alice  ',
    })

    expect(result.user.name).toBe('Alice')
  })

  it('creates org name from email when no name provided', async () => {
    const result = await useCase.execute({
      email: 'noname@test.com',
      password: 'password123',
    })

    expect(result.organization.name).toBe("noname@test.com's Organization")
  })
})
