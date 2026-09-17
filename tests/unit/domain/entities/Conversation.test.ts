import { describe, it, expect } from 'bun:test'
import { Conversation } from '../../../../src/domain/entities/Conversation.js'

describe('Conversation entity', () => {
  const validProps = {
    organizationId: 'org-123',
    userId: 'user-456',
    title: 'Support Chat',
    model: 'gpt-4o',
  }

  describe('create()', () => {
    it('creates a conversation with valid props', () => {
      const conv = Conversation.create(validProps)

      expect(conv.organizationId).toBe('org-123')
      expect(conv.userId).toBe('user-456')
      expect(conv.title).toBe('Support Chat')
      expect(conv.model).toBe('gpt-4o')
      expect(conv.id).toStrictEqual(expect.any(String))
      expect(conv.createdAt).toBeInstanceOf(Date)
    })

    it('creates a conversation without optional fields', () => {
      const conv = Conversation.create({
        organizationId: 'org-123',
        userId: 'user-456',
      })

      expect(conv.title).toBeNull()
      expect(conv.model).toBeNull()
    })

    it('throws on missing organizationId', () => {
      expect(() =>
        Conversation.create({ organizationId: '', userId: 'user-1' }),
      ).toThrow('Organization ID is required')
    })

    it('throws on missing userId', () => {
      expect(() =>
        Conversation.create({ organizationId: 'org-1', userId: '' }),
      ).toThrow('User ID is required')
    })

    it('preserves the model when provided', () => {
      const conv = Conversation.create({
        organizationId: 'org-1',
        userId: 'user-1',
        model: 'claude-3-opus',
      })

      expect(conv.model).toBe('claude-3-opus')
    })
  })

  describe('reconstitute()', () => {
    it('preserves all fields including id', () => {
      const now = new Date('2024-03-01T00:00:00Z')
      const conv = Conversation.reconstitute({
        id: 'conv-fixed-id',
        organizationId: 'org-1',
        userId: 'user-1',
        title: 'Old Chat',
        model: 'gpt-4',
        createdAt: now,
        updatedAt: now,
      })

      expect(conv.id).toBe('conv-fixed-id')
      expect(conv.title).toBe('Old Chat')
      expect(conv.model).toBe('gpt-4')
      expect(conv.createdAt).toBe(now)
    })
  })
})
