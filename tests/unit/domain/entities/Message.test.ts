import { describe, it, expect } from 'bun:test'
import {
  Message,
  MessageRole,
} from '../../../../src/domain/entities/Message.js'

describe('Message entity', () => {
  const validProps = {
    conversationId: 'conv-123',
    organizationId: 'org-456',
    role: MessageRole.USER,
    content: 'Hello, how are you?',
  }

  describe('create()', () => {
    it('creates a message with valid props', () => {
      const msg = Message.create(validProps)

      expect(msg.conversationId).toBe('conv-123')
      expect(msg.organizationId).toBe('org-456')
      expect(msg.role).toBe(MessageRole.USER)
      expect(msg.content).toBe('Hello, how are you?')
      expect(msg.tokenCount).toBeNull()
      expect(msg.id).toStrictEqual(expect.any(String))
    })

    it('creates a message with tokenCount', () => {
      const msg = Message.create({ ...validProps, tokenCount: 42 })

      expect(msg.tokenCount).toBe(42)
    })

    it('creates messages with all role types', () => {
      const user = Message.create({ ...validProps, role: MessageRole.USER })
      const assistant = Message.create({
        ...validProps,
        role: MessageRole.ASSISTANT,
        content: "I'm doing well!",
      })
      const system = Message.create({
        ...validProps,
        role: MessageRole.SYSTEM,
        content: 'You are a helpful assistant.',
      })

      expect(user.role).toBe('user')
      expect(assistant.role).toBe('assistant')
      expect(system.role).toBe('system')
    })

    it('throws on missing conversationId', () => {
      expect(() =>
        Message.create({ ...validProps, conversationId: '' }),
      ).toThrow('Conversation ID is required')
    })

    it('throws on missing organizationId', () => {
      expect(() =>
        Message.create({ ...validProps, organizationId: '' }),
      ).toThrow('Organization ID is required')
    })

    it('throws on empty content', () => {
      expect(() => Message.create({ ...validProps, content: '' })).toThrow(
        'Message content is required',
      )
    })

    it('throws on missing content', () => {
      expect(() => Message.create({ ...validProps, content: '' })).toThrow(
        'Message content is required',
      )
    })

    it('accepts long content', () => {
      const longContent = 'x'.repeat(100_000)
      const msg = Message.create({ ...validProps, content: longContent })

      expect(msg.content).toBe(longContent)
      expect(msg.content.length).toBe(100_000)
    })
  })

  describe('reconstitute()', () => {
    it('preserves all fields including id', () => {
      const now = new Date('2024-05-15T12:00:00Z')
      const msg = Message.reconstitute({
        id: 'msg-fixed-id',
        conversationId: 'conv-1',
        organizationId: 'org-1',
        role: MessageRole.ASSISTANT,
        content: 'I am an AI.',
        tokenCount: 15,
        createdAt: now,
        updatedAt: now,
      })

      expect(msg.id).toBe('msg-fixed-id')
      expect(msg.conversationId).toBe('conv-1')
      expect(msg.role).toBe(MessageRole.ASSISTANT)
      expect(msg.content).toBe('I am an AI.')
      expect(msg.tokenCount).toBe(15)
      expect(msg.createdAt).toBe(now)
    })
  })

  describe('MessageRole enum', () => {
    it('has expected string values', () => {
      expect(MessageRole.USER).toBe('user')
      expect(MessageRole.ASSISTANT).toBe('assistant')
      expect(MessageRole.SYSTEM).toBe('system')
    })
  })
})
