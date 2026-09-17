import { randomUUID } from 'node:crypto'
import type { UserRepository } from '../../src/domain/ports/UserRepository.js'
import type { OrganizationRepository } from '../../src/domain/ports/OrganizationRepository.js'
import type { OrganizationMemberRepository } from '../../src/domain/ports/OrganizationMemberRepository.js'
import type { PasswordHasher } from '../../src/domain/ports/PasswordHasher.js'
import type { RefreshTokenRepository } from '../../src/domain/ports/RefreshTokenRepository.js'
import type { RefreshTokenRecord } from '../../src/domain/ports/RefreshTokenRepository.js'
import type {
  TokenService,
  TokenPayload,
} from '../../src/domain/ports/TokenService.js'
import type { ConversationRepository } from '../../src/domain/ports/ConversationRepository.js'
import type { MessageRepository } from '../../src/domain/ports/MessageRepository.js'
import type { ModelRepository } from '../../src/domain/ports/ModelRepository.js'
import type { LLMRequestRepository } from '../../src/domain/ports/LLMRequestRepository.js'
import type {
  LLMProvider,
  LLMGenerateRequest,
  LLMResponse,
  LLMStreamChunk,
} from '../../src/domain/ports/LLMProvider.js'
import type { CacheService } from '../../src/domain/ports/CacheService.js'
import type {
  IdempotencyRepository,
  IdempotencyRecord,
} from '../../src/domain/ports/IdempotencyRepository.js'
import { User } from '../../src/domain/entities/User.js'
import { Organization } from '../../src/domain/entities/Organization.js'
import { OrganizationMember } from '../../src/domain/entities/OrganizationMember.js'
import { Conversation } from '../../src/domain/entities/Conversation.js'
import { Message } from '../../src/domain/entities/Message.js'
import { Model } from '../../src/domain/entities/Model.js'
import type { MessageRole } from '../../src/domain/entities/Message.js'
import type { UserRole } from '../../src/domain/entities/User.js'

// ── In-memory UserRepository ──

export function createMockUserRepo(): UserRepository & {
  _store: Map<string, User>
} {
  const store = new Map<string, User>()

  return {
    _store: store,

    async findById(id) {
      for (const u of store.values()) {
        if (u.id === id) return u
      }
      return null
    },

    async findByEmail(email) {
      for (const u of store.values()) {
        if (u.email === email) return u
      }
      return null
    },

    async create(params) {
      const user = User.create(params)
      store.set(user.id, user)
      return user
    },

    async update(id, data) {
      const user = store.get(id)
      if (!user) throw new Error(`User ${id} not found`)
      if (data.name !== undefined) user.name = data.name
      if (data.passwordHash !== undefined) user.passwordHash = data.passwordHash
      user.touch()
      return user
    },

    async delete(id) {
      store.delete(id)
    },
  }
}

// ── In-memory OrganizationRepository ──

export function createMockOrgRepo(): OrganizationRepository & {
  _store: Map<string, Organization>
} {
  const store = new Map<string, Organization>()

  return {
    _store: store,

    async findById(id) {
      return store.get(id) ?? null
    },

    async findByOwnerId(ownerId) {
      return [...store.values()].filter((o) => o.ownerId === ownerId)
    },

    async findByUserId(userId) {
      // Simplified: in real app would check membership
      return [...store.values()].filter((o) => o.ownerId === userId)
    },

    async create(params) {
      const org = Organization.create(params)
      store.set(org.id, org)
      return org
    },

    async update(id, data) {
      const org = store.get(id)
      if (!org) throw new Error(`Org ${id} not found`)
      if (data.name !== undefined) org.name = data.name
      org.touch()
      return org
    },

    async delete(id) {
      store.delete(id)
    },
  }
}

// ── In-memory OrganizationMemberRepository ──

export function createMockMemberRepo(): OrganizationMemberRepository & {
  _store: Map<string, OrganizationMember>
} {
  const store = new Map<string, OrganizationMember>()

  return {
    _store: store,

    async findByOrganizationAndUser(organizationId, userId) {
      for (const m of store.values()) {
        if (m.organizationId === organizationId && m.userId === userId) return m
      }
      return null
    },

    async findByOrganizationId(organizationId) {
      return [...store.values()].filter(
        (m) => m.organizationId === organizationId,
      )
    },

    async findByUserId(userId) {
      return [...store.values()].filter((m) => m.userId === userId)
    },

    async add(params) {
      const member = OrganizationMember.create(params)
      store.set(member.id, member)
      return member
    },

    async updateRole(id, role) {
      const member = store.get(id)
      if (!member) throw new Error(`Member ${id} not found`)
      member.role = role
      member.touch()
      return member
    },

    async remove(id) {
      store.delete(id)
    },

    async countByOrganizationId(organizationId) {
      return [...store.values()].filter(
        (m) => m.organizationId === organizationId,
      ).length
    },
  }
}

// ── Simple PasswordHasher (not secure, for testing only) ──

export function createMockHasher(): PasswordHasher {
  return {
    async hash(password: string): Promise<string> {
      return `hashed:${password}`
    },
    async verify(hash: string, password: string): Promise<boolean> {
      return hash === `hashed:${password}`
    },
  }
}

// ── In-memory RefreshTokenRepository ──

export function createMockRefreshTokenRepo(): RefreshTokenRepository & {
  _store: Map<string, RefreshTokenRecord>
} {
  const store = new Map<string, RefreshTokenRecord>()

  return {
    _store: store,

    async create(params) {
      const record: RefreshTokenRecord = {
        id: randomUUID(),
        userId: params.userId,
        organizationId: params.organizationId ?? null,
        tokenHash: params.tokenHash,
        family: params.family,
        expiresAt: params.expiresAt,
        revokedAt: null,
        createdAt: new Date(),
      }
      store.set(record.id, record)
      return record
    },

    async findByTokenHash(tokenHash) {
      for (const r of store.values()) {
        if (r.tokenHash === tokenHash) return r
      }
      return null
    },

    async revokeByFamily(family) {
      for (const r of store.values()) {
        if (r.family === family) {
          r.revokedAt = new Date()
        }
      }
    },

    async revokeById(id) {
      const r = store.get(id)
      if (r) r.revokedAt = new Date()
    },

    async deleteExpired() {
      let count = 0
      const now = new Date()
      for (const [id, r] of store.entries()) {
        if (r.expiresAt < now) {
          store.delete(id)
          count++
        }
      }
      return count
    },
  }
}

// ── Simple TokenService (not secure, for testing only) ──

export function createMockTokenService(): TokenService {
  let counter = 0

  return {
    async generateAccessToken(payload) {
      return `access_token_${payload.sub}_${++counter}`
    },
    async generateRefreshToken() {
      return `refresh_token_${++counter}`
    },
    async verifyAccessToken(token) {
      // Simple parser for our mock tokens
      const parts = token.split('_')
      return {
        sub: parts[2] ?? 'unknown',
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      }
    },
    async hashToken(token) {
      return `hash_${token}`
    },
    generateId() {
      return randomUUID()
    },
  }
}

// ── In-memory ConversationRepository ──

export function createMockConversationRepo(): ConversationRepository & {
  _store: Map<string, Conversation>
} {
  const store = new Map<string, Conversation>()

  return {
    _store: store,

    async findById(organizationId, id) {
      const conv = store.get(id)
      if (conv && conv.organizationId === organizationId) return conv
      return null
    },

    async findByOrganizationId(organizationId, params) {
      const conversations = [...store.values()]
        .filter((c) => c.organizationId === organizationId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, params.limit)
      return { data: conversations, nextCursor: null }
    },

    async create(params) {
      const conv = Conversation.create(params)
      store.set(conv.id, conv)
      return conv
    },

    async update(id, data) {
      const conv = store.get(id)
      if (!conv) throw new Error(`Conversation ${id} not found`)
      if (data.title !== undefined) conv.title = data.title
      if (data.model !== undefined) conv.model = data.model
      conv.touch()
      return conv
    },

    async delete(_organizationId, id) {
      store.delete(id)
    },
  }
}

// ── In-memory MessageRepository ──

export function createMockMessageRepo(): MessageRepository & {
  _store: Map<string, Message>
} {
  const store = new Map<string, Message>()

  return {
    _store: store,

    async findByConversationId(conversationId, _organizationId, params) {
      const messages = [...store.values()]
        .filter((m) => m.conversationId === conversationId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .slice(-params.limit)
      return { data: messages, nextCursor: null }
    },

    async create(params) {
      const msg = Message.create(params)
      store.set(msg.id, msg)
      return msg
    },

    async countByConversationId(conversationId) {
      return [...store.values()].filter(
        (m) => m.conversationId === conversationId,
      ).length
    },
  }
}

// ── In-memory ModelRepository ──

export function createMockModelRepo(): ModelRepository & {
  _store: Map<string, Model>
} {
  const store = new Map<string, Model>()

  return {
    _store: store,

    async findById(id) {
      return store.get(id) ?? null
    },

    async findByModel(model) {
      for (const m of store.values()) {
        if (m.model === model) return m
      }
      return null
    },

    async findAll(params) {
      let models = [...store.values()]
      if (params?.enabled !== undefined) {
        models = models.filter((m) => m.enabled === params.enabled)
      }
      return models
    },

    async create(model) {
      store.set(model.id, model)
      return model
    },

    async update(id, data) {
      const model = store.get(id)
      if (!model) throw new Error(`Model ${id} not found`)
      Object.assign(model, data)
      model.touch()
      return model
    },

    async delete(id) {
      store.delete(id)
    },
  }
}

// ── In-memory LLMRequestRepository ──

export function createMockRequestRepo(): LLMRequestRepository & {
  _store: Map<string, any>
} {
  const store = new Map<string, any>()

  return {
    _store: store,

    async create(params) {
      const id = randomUUID()
      const record = {
        id,
        ...params,
        createdAt: new Date(),
      }
      store.set(id, record)
      return record
    },

    async findByOrganizationId(params) {
      const logs = [...store.values()]
        .filter((l) => l.organizationId === params.organizationId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, params.limit)
      return { data: logs, nextCursor: null }
    },

    async getSummary(organizationId) {
      const logs = [...store.values()].filter(
        (l) => l.organizationId === organizationId,
      )
      return {
        totalRequests: logs.length,
        totalInputTokens: logs.reduce(
          (sum, l) => sum + (l.inputTokens ?? 0),
          0,
        ),
        totalOutputTokens: logs.reduce(
          (sum, l) => sum + (l.outputTokens ?? 0),
          0,
        ),
        totalTokens: logs.reduce((sum, l) => sum + (l.totalTokens ?? 0), 0),
        estimatedCost: 0,
      }
    },
  }
}

// ── Mock LLMProvider ──

export function createMockLLMProvider(
  name = 'openai',
  responseOverride?: Partial<LLMResponse>,
): LLMProvider & { _calls: LLMGenerateRequest[] } {
  const calls: LLMGenerateRequest[] = []

  return {
    name,
    _calls: calls,

    async generate(request: LLMGenerateRequest): Promise<LLMResponse> {
      calls.push(request)
      return {
        id: randomUUID(),
        provider: name,
        model: request.model,
        content: `Mock response for: ${request.messages[request.messages.length - 1]?.content ?? ''}`,
        finishReason: 'stop',
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
        },
        ...responseOverride,
      }
    },

    async *stream(request: LLMGenerateRequest): AsyncIterable<LLMStreamChunk> {
      calls.push(request)
      yield {
        id: randomUUID(),
        provider: name,
        model: request.model,
        delta: 'Hello',
        finishReason: null,
      }
      yield {
        id: randomUUID(),
        provider: name,
        model: request.model,
        delta: '',
        finishReason: 'stop',
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      }
    },
  }
}

// ── Mock CacheService ──

export function createMockCacheService(): CacheService & {
  _store: Map<string, string>
  _counts: Map<string, number>
} {
  const store = new Map<string, string>()
  const counts = new Map<string, number>()

  return {
    _store: store,
    _counts: counts,

    async get(key) {
      return store.get(key) ?? null
    },

    async set(key, value) {
      store.set(key, value)
    },

    async del(key) {
      store.delete(key)
      counts.delete(key)
    },

    async incr(key) {
      const n = (counts.get(key) ?? 0) + 1
      counts.set(key, n)
      return n
    },

    async decr(key) {
      const n = (counts.get(key) ?? 0) - 1
      counts.set(key, n)
      return n
    },

    async incrWithTTL(key, _ttlSeconds) {
      const n = (counts.get(key) ?? 0) + 1
      counts.set(key, n)
      return n
    },

    async setNX(key, value, _ttlSeconds) {
      if (store.has(key)) return false
      store.set(key, value)
      return true
    },

    async exists(key) {
      return store.has(key)
    },
  }
}

// ── Mock IdempotencyRepository ──

export function createMockIdempotencyRepo(): IdempotencyRepository & {
  _store: Map<string, IdempotencyRecord>
} {
  const store = new Map<string, IdempotencyRecord>()

  return {
    _store: store,

    async findOrCreate(params) {
      // Check if key already exists for this org
      for (const r of store.values()) {
        if (
          r.organizationId === params.organizationId &&
          r.key === params.key
        ) {
          const isDuplicate = r.requestFingerprint === params.requestFingerprint
          return { record: r, isDuplicate }
        }
      }
      const record: IdempotencyRecord = {
        id: randomUUID(),
        organizationId: params.organizationId,
        key: params.key,
        requestFingerprint: params.requestFingerprint,
        status: 'pending',
        expiresAt: params.expiresAt,
        createdAt: new Date(),
      }
      store.set(record.id, record)
      return { record, isDuplicate: false }
    },

    async complete(id, statusCode, body) {
      const r = store.get(id)
      if (r) {
        r.status = 'completed'
        r.responseStatusCode = statusCode
        r.responseBody = body
      }
    },

    async fail(id, statusCode, body) {
      const r = store.get(id)
      if (r) {
        r.status = 'error'
        r.responseStatusCode = statusCode
        r.responseBody = body
      }
    },

    async findPendingByKey(key) {
      for (const r of store.values()) {
        if (r.key === key && r.status === 'pending') return r
      }
      return null
    },

    async deleteExpired() {
      let count = 0
      const now = new Date()
      for (const [id, r] of store.entries()) {
        if (r.expiresAt < now) {
          store.delete(id)
          count++
        }
      }
      return count
    },
  }
}
