import { describe, it, expect, beforeEach } from 'bun:test'
import { CompletionUseCase } from '../../../../src/application/completions/CompletionUseCase.js'
import {
  createMockModelRepo,
  createMockLLMProvider,
  createMockRequestRepo,
  createMockCacheService,
  createMockIdempotencyRepo,
} from '../../mocks.js'
import { Model } from '../../../../src/domain/entities/Model.js'
import { randomUUID } from 'node:crypto'

describe('CompletionUseCase', () => {
  let modelRepo: ReturnType<typeof createMockModelRepo>
  let provider: ReturnType<typeof createMockLLMProvider>
  let requestRepo: ReturnType<typeof createMockRequestRepo>
  let cache: ReturnType<typeof createMockCacheService>
  let idempotencyRepo: ReturnType<typeof createMockIdempotencyRepo>
  let useCase: CompletionUseCase

  beforeEach(() => {
    modelRepo = createMockModelRepo()
    provider = createMockLLMProvider('openai')
    requestRepo = createMockRequestRepo()
    cache = createMockCacheService()
    idempotencyRepo = createMockIdempotencyRepo()
    useCase = new CompletionUseCase(
      modelRepo,
      [provider],
      requestRepo,
      cache,
      idempotencyRepo,
      { MAX_CONCURRENT_LLM_REQUESTS: 10 },
    )
  })

  async function setupModel(modelName = 'gpt-4o', enabled = true) {
    const model = Model.create({
      provider: 'openai',
      model: modelName,
      displayName: 'GPT-4o',
      enabled,
      contextWindow: 128_000,
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
    })
    await modelRepo.create(model)
    return model
  }

  it('returns completion result on successful request', async () => {
    await setupModel()

    const result = await useCase.execute({
      organizationId: 'org-1',
      requestId: 'req-1',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    })

    expect(result).toEqual({
      id: expect.any(String),
      provider: 'openai',
      model: 'gpt-4o',
      content: expect.stringContaining('Mock response'),
      finishReason: 'stop',
      usage: {
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
      },
    })
  })

  it('calls the provider with correct arguments', async () => {
    await setupModel()

    const messages = [
      { role: 'system' as const, content: 'You are helpful.' },
      { role: 'user' as const, content: 'What is 2+2?' },
    ]

    await useCase.execute({
      organizationId: 'org-1',
      requestId: 'req-2',
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      maxTokens: 100,
    })

    expect(provider._calls.length).toBe(1)
    expect(provider._calls[0]!.model).toBe('gpt-4o')
    expect(provider._calls[0]!.messages).toEqual(messages)
    expect(provider._calls[0]!.temperature).toBe(0.7)
    expect(provider._calls[0]!.maxTokens).toBe(100)
  })

  it('logs the request on success', async () => {
    await setupModel()

    await useCase.execute({
      organizationId: 'org-1',
      userId: 'user-1',
      requestId: 'req-log',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Test' }],
    })

    const logs = [...requestRepo._store.values()]
    expect(logs.length).toBe(1)
    expect(logs[0]!.status).toBe('success')
    expect(logs[0]!.requestId).toBe('req-log')
    expect(logs[0]!.provider).toBe('openai')
    expect(logs[0]!.model).toBe('gpt-4o')
    expect(logs[0]!.totalTokens).toBe(30)
  })

  it('throws NotFoundError when model not found', async () => {
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        requestId: 'req-1',
        model: 'nonexistent',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    ).rejects.toThrow('Model "nonexistent" not found')
  })

  it('throws NotFoundError when model is disabled', async () => {
    await setupModel('old-model', false)

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        requestId: 'req-1',
        model: 'old-model',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    ).rejects.toThrow('Model "old-model" not found')
  })

  it('throws NotFoundError when provider not found', async () => {
    const model = Model.create({
      provider: 'missing-provider',
      model: 'x-model',
      displayName: 'X',
      enabled: true,
      contextWindow: 4_000,
      supportsStreaming: false,
      supportsTools: false,
      supportsVision: false,
    })
    await modelRepo.create(model)

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        requestId: 'req-1',
        model: 'x-model',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    ).rejects.toThrow('Provider "missing-provider" not found')
  })

  it('logs error and rethrows when provider fails', async () => {
    await setupModel()
    const failProvider = createMockLLMProvider('openai')
    failProvider.generate = async () => {
      throw new Error('Provider timeout')
    }
    const failingUseCase = new CompletionUseCase(
      modelRepo,
      [failProvider],
      requestRepo,
      cache,
      idempotencyRepo,
      { MAX_CONCURRENT_LLM_REQUESTS: 10 },
    )

    await expect(
      failingUseCase.execute({
        organizationId: 'org-1',
        userId: 'user-1',
        requestId: 'req-fail',
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    ).rejects.toThrow('Provider timeout')

    // Error should be logged
    const logs = [...requestRepo._store.values()]
    expect(logs.length).toBe(1)
    expect(logs[0]!.status).toBe('error')
    expect(logs[0]!.errorMessage).toBe('Provider timeout')
  })

  it('decrements concurrency counter after completion', async () => {
    await setupModel()

    await useCase.execute({
      organizationId: 'org-1',
      requestId: 'req-1',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    })

    // After completion, the counter should be decremented back to 0
    expect(cache._counts.get('concurrency:org-1')).toBe(0)
  })

  it('decrements concurrency counter even on failure', async () => {
    await setupModel()
    const failProvider = createMockLLMProvider('openai')
    failProvider.generate = async () => {
      throw new Error('Boom')
    }
    const failingUseCase = new CompletionUseCase(
      modelRepo,
      [failProvider],
      requestRepo,
      cache,
      idempotencyRepo,
      { MAX_CONCURRENT_LLM_REQUESTS: 10 },
    )

    await failingUseCase
      .execute({
        organizationId: 'org-1',
        requestId: 'req-1',
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
      })
      .catch(() => {})

    expect(cache._counts.get('concurrency:org-1')).toBe(0)
  })

  describe('idempotency', () => {
    it('returns cached response for duplicate idempotency key', async () => {
      await setupModel()

      const key = 'idem-key-1'
      const input = {
        organizationId: 'org-1',
        requestId: 'req-1',
        model: 'gpt-4o',
        messages: [{ role: 'user' as const, content: 'Hello' }],
        idempotencyKey: key,
      }

      // First call: processes normally
      const first = await useCase.execute(input)
      expect(first.content).toContain('Mock response')

      // Manually set the idempotency record to completed
      const record = [...idempotencyRepo._store.values()].find(
        (r) => r.key === key,
      )
      expect(record).toBeDefined()
      await idempotencyRepo.complete(record!.id, 200, JSON.stringify(first))

      // Second call with same key: should return cached response
      const second = await useCase.execute(input)
      expect(second).toEqual(first)
      // Provider should only have been called once
      expect(provider._calls.length).toBe(1)
    })
  })
})
