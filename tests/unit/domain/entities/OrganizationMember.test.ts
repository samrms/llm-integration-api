import { describe, it, expect } from 'bun:test'
import { OrganizationMember } from '../../../../src/domain/entities/OrganizationMember.js'
import { UserRole } from '../../../../src/domain/entities/User.js'

describe('OrganizationMember entity', () => {
  const validProps = {
    organizationId: 'org-123',
    userId: 'user-456',
    role: UserRole.MEMBER,
  }

  describe('create()', () => {
    it('creates a member with valid props', () => {
      const member = OrganizationMember.create(validProps)

      expect(member.organizationId).toBe('org-123')
      expect(member.userId).toBe('user-456')
      expect(member.role).toBe(UserRole.MEMBER)
      expect(member.id).toStrictEqual(expect.any(String))
    })

    it('throws on missing organizationId', () => {
      expect(() =>
        OrganizationMember.create({ ...validProps, organizationId: '' }),
      ).toThrow('Organization ID is required')
    })

    it('throws on missing userId', () => {
      expect(() =>
        OrganizationMember.create({ ...validProps, userId: '' }),
      ).toThrow('User ID is required')
    })
  })

  describe('hasMinimumRole()', () => {
    it('MEMBER >= MEMBER is true', () => {
      const member = OrganizationMember.create({
        ...validProps,
        role: UserRole.MEMBER,
      })
      expect(member.hasMinimumRole(UserRole.MEMBER)).toBe(true)
    })

    it('MEMBER >= ADMIN is false', () => {
      const member = OrganizationMember.create({
        ...validProps,
        role: UserRole.MEMBER,
      })
      expect(member.hasMinimumRole(UserRole.ADMIN)).toBe(false)
    })

    it('MEMBER >= OWNER is false', () => {
      const member = OrganizationMember.create({
        ...validProps,
        role: UserRole.MEMBER,
      })
      expect(member.hasMinimumRole(UserRole.OWNER)).toBe(false)
    })

    it('ADMIN >= MEMBER is true', () => {
      const member = OrganizationMember.create({
        ...validProps,
        role: UserRole.ADMIN,
      })
      expect(member.hasMinimumRole(UserRole.MEMBER)).toBe(true)
    })

    it('ADMIN >= ADMIN is true', () => {
      const member = OrganizationMember.create({
        ...validProps,
        role: UserRole.ADMIN,
      })
      expect(member.hasMinimumRole(UserRole.ADMIN)).toBe(true)
    })

    it('ADMIN >= OWNER is false', () => {
      const member = OrganizationMember.create({
        ...validProps,
        role: UserRole.ADMIN,
      })
      expect(member.hasMinimumRole(UserRole.OWNER)).toBe(false)
    })

    it('OWNER >= MEMBER is true', () => {
      const member = OrganizationMember.create({
        ...validProps,
        role: UserRole.OWNER,
      })
      expect(member.hasMinimumRole(UserRole.MEMBER)).toBe(true)
    })

    it('OWNER >= ADMIN is true', () => {
      const member = OrganizationMember.create({
        ...validProps,
        role: UserRole.OWNER,
      })
      expect(member.hasMinimumRole(UserRole.ADMIN)).toBe(true)
    })

    it('OWNER >= OWNER is true', () => {
      const member = OrganizationMember.create({
        ...validProps,
        role: UserRole.OWNER,
      })
      expect(member.hasMinimumRole(UserRole.OWNER)).toBe(true)
    })
  })

  describe('reconstitute()', () => {
    it('preserves all fields', () => {
      const now = new Date('2024-01-01T00:00:00Z')
      const member = OrganizationMember.reconstitute({
        id: 'member-id-1',
        organizationId: 'org-1',
        userId: 'user-1',
        role: UserRole.ADMIN,
        createdAt: now,
        updatedAt: now,
      })

      expect(member.id).toBe('member-id-1')
      expect(member.role).toBe(UserRole.ADMIN)
      expect(member.createdAt).toBe(now)
    })
  })
})
