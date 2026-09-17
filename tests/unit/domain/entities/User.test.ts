import { describe, it, expect } from 'bun:test'
import { User, UserRole } from '../../../../src/domain/entities/User.js'

describe('User entity', () => {
  const validProps = {
    email: 'alice@example.com',
    passwordHash: '$argon2id$v=19$m=65536$abc$def',
    name: 'Alice',
  }

  describe('create()', () => {
    it('creates a user with valid props', () => {
      const user = User.create(validProps)

      expect(user.email).toBe('alice@example.com')
      expect(user.passwordHash).toBe('$argon2id$v=19$m=65536$abc$def')
      expect(user.name).toBe('Alice')
      expect(user.id).toStrictEqual(expect.any(String))
      expect(user.createdAt).toBeInstanceOf(Date)
      expect(user.updatedAt).toBeInstanceOf(Date)
    })

    it('creates a user without optional name', () => {
      const user = User.create({
        email: 'bob@example.com',
        passwordHash: 'hash123',
      })

      expect(user.email).toBe('bob@example.com')
      expect(user.name).toBeNull()
    })

    it('normalizes email to lowercase', () => {
      const user = User.create({
        email: 'ALICE@EXAMPLE.COM',
        passwordHash: 'hash123',
      })

      expect(user.email).toBe('alice@example.com')
    })

    it('normalizes mixed-case email to lowercase', () => {
      const user = User.create({
        email: 'AlIcE@ExAmPlE.CoM',
        passwordHash: 'hash123',
      })

      expect(user.email).toBe('alice@example.com')
    })

    it('throws on empty email', () => {
      expect(() => User.create({ email: '', passwordHash: 'hash123' })).toThrow(
        'Email is required',
      )
    })

    it('throws on missing email', () => {
      expect(() => User.create({ email: '', passwordHash: 'hash123' })).toThrow(
        'Email is required',
      )
    })

    it('throws on empty passwordHash', () => {
      expect(() =>
        User.create({ email: 'alice@example.com', passwordHash: '' }),
      ).toThrow('Password hash is required')
    })

    it('throws on missing passwordHash', () => {
      expect(() =>
        User.create({ email: 'alice@example.com', passwordHash: '' }),
      ).toThrow('Password hash is required')
    })
  })

  describe('reconstitute()', () => {
    it('preserves all fields including id', () => {
      const now = new Date('2024-01-15T10:00:00Z')
      const user = User.reconstitute({
        id: 'fixed-uuid-123',
        email: 'carol@example.com',
        passwordHash: 'stored-hash',
        name: 'Carol',
        createdAt: now,
        updatedAt: now,
      })

      expect(user.id).toBe('fixed-uuid-123')
      expect(user.email).toBe('carol@example.com')
      expect(user.passwordHash).toBe('stored-hash')
      expect(user.name).toBe('Carol')
      expect(user.createdAt).toBe(now)
      expect(user.updatedAt).toBe(now)
    })

    it('still normalizes email on reconstitute', () => {
      const user = User.reconstitute({
        id: 'id-1',
        email: 'UPPER@CASE.COM',
        passwordHash: 'hash',
      })

      expect(user.email).toBe('upper@case.com')
    })
  })

  describe('UserRole enum', () => {
    it('has expected values', () => {
      expect(UserRole.OWNER).toBe('OWNER')
      expect(UserRole.ADMIN).toBe('ADMIN')
      expect(UserRole.MEMBER).toBe('MEMBER')
    })
  })
})
