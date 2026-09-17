import { describe, it, expect, beforeEach } from 'bun:test'
import { SendMessageUseCase } from '../../../../src/application/conversations/SendMessageUseCase.js'
import {
  createMockConversationRepo,
  createMockMessageRepo,
  createMockModelRepo,
  createMockRequestRepo,
  createMockLLMProvider,
} from '../../mocks.js'
import { Model } from '../../../../src/domain/entities/Model.js'
import { MessageRole } from '../../../../src/domain/entities/Message.js'

describe('SendMessageUseCase', () => {
  let conversationRepo: ReturnType<typeof createMockConversationRepo>
  let messageRepo: ReturnType<typeof createMockMessageRepo>
  let modelRepo: ReturnType<typeof createMockModelRepo>
  let requestRepo: ReturnType<typeof createMockRequestRepo>
  let provider: ReturnType<typeof createMockLLMProvider>
  let useCase: SendMessageUseCase

  beforeEach(() => {
    conversationRepo = createMockConversationRepo()
    messageRepo = createMockMessageRepo()
    modelRepo = createMockModelRepo()
    requestRepo = createMockRequestRepo()
    provider = createMockLLMProvider('openai')
    useCase = new SendMessageUseCase(
      conversationRepo,
      messageRepo,
      [provider],
      modelRepo,
      requestRepo,
    )
  })

  async function setupConversation(orgId = 'org-1', userId = 'user-1') {
    const conv = await conversationRepo.create({
      organizationId: orgId,
      userId,
      title: 'Test Chat',
    })

    const model = Model.create({
      provider: 'openai',
      model: 'gpt-4o',
      displayName: 'GPT-4o',
      enabled: true,
      contextWindow: 128_000,
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
    })
    await modelRepo.create(model)

    return { conv, model }
  }

  it('sends a message and returns both user and assistant messages', async () => {
    const { conv } = await setupConversation()

    const result = await useCase.execute({
      organizationId: conv.organizationId,
      conversationId: conv.id,
      userId: 'user-1',
      content: 'Hello, AI!',
      model: 'gpt-4o',
    })

    expect(result.userMessage).toBeDefined()
    expect(result.userMessage.role).toBe(MessageRole.USER)
    expect(result.userMessage.content).toBe('Hello, AI!')
    expect(result.userMessage.conversationId).toBe(conv.id)

    expect(result.assistantMessage).toBeDefined()
    expect(result.assistantMessage.role).toBe(MessageRole.ASSISTANT)
    expect(result.assistantMessage.conversationId).toBe(conv.id)

    expect(result.usage).toEqual({
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
    })
  })

  it('calls the LLM provider with correct messages', async () => {
    const { conv } = await setupConversation()

    await useCase.execute({
      organizationId: conv.organizationId,
      conversationId: conv.id,
      userId: 'user-1',
      content: 'What is 2+2?',
      model: 'gpt-4o',
    })

    expect(provider._calls.length).toBe(1)
    expect(provider._calls[0]!.model).toBe('gpt-4o')
    expect(provider._calls[0]!.messages).toContainEqual({
      role: 'user',
      content: 'What is 2+2?',
    })
  })

  it('logs the request in the request repository', async () => {
    const { conv } = await setupConversation()

    await useCase.execute({
      organizationId: conv.organizationId,
      conversationId: conv.id,
      userId: 'user-1',
      content: 'Test',
      model: 'gpt-4o',
    })

    const logs = [...requestRepo._store.values()]
    expect(logs.length).toBe(1)
    expect(logs[0]!.status).toBe('success')
    expect(logs[0]!.provider).toBe('openai')
    expect(logs[0]!.model).toBe('gpt-4o')
    expect(logs[0]!.organizationId).toBe(conv.organizationId)
    expect(logs[0]!.totalTokens).toBe(30)
  })

  it('throws NotFoundError when conversation not found', async () => {
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        conversationId: 'nonexistent-conv',
        userId: 'user-1',
        content: 'Hello',
      }),
    ).rejects.toThrow('Conversation not found')
  })

  it('throws NotFoundError when model not found', async () => {
    const conv = await conversationRepo.create({
      organizationId: 'org-1',
      userId: 'user-1',
    })

    await expect(
      useCase.execute({
        organizationId: conv.organizationId,
        conversationId: conv.id,
        userId: 'user-1',
        content: 'Hello',
        model: 'nonexistent-model',
      }),
    ).rejects.toThrow('Model "nonexistent-model" not found')
  })

  it('throws NotFoundError when model is disabled', async () => {
    const conv = await conversationRepo.create({
      organizationId: 'org-1',
      userId: 'user-1',
    })

    const disabledModel = Model.create({
      provider: 'openai',
      model: 'gpt-4o-old',
      displayName: 'GPT-4o Old',
      enabled: false,
      contextWindow: 8_000,
      supportsStreaming: false,
      supportsTools: false,
      supportsVision: false,
    })
    await modelRepo.create(disabledModel)

    await expect(
      useCase.execute({
        organizationId: conv.organizationId,
        conversationId: conv.id,
        userId: 'user-1',
        content: 'Hello',
        model: 'gpt-4o-old',
      }),
    ).rejects.toThrow('Model "gpt-4o-old" not found')
  })

  it('throws NotFoundError when provider not found', async () => {
    const conv = await conversationRepo.create({
      organizationId: 'org-1',
      userId: 'user-1',
    })

    const model = Model.create({
      provider: 'unknown-provider',
      model: 'some-model',
      displayName: 'Some Model',
      enabled: true,
      contextWindow: 4_000,
      supportsStreaming: false,
      supportsTools: false,
      supportsVision: false,
    })
    await modelRepo.create(model)

    await expect(
      useCase.execute({
        organizationId: conv.organizationId,
        conversationId: conv.id,
        userId: 'user-1',
        content: 'Hello',
        model: 'some-model',
      }),
    ).rejects.toThrow('Provider "unknown-provider" not found')
  })

  it('persists both user and assistant messages in the repo', async () => {
    const { conv } = await setupConversation()

    await useCase.execute({
      organizationId: conv.organizationId,
      conversationId: conv.id,
      userId: 'user-1',
      content: 'Hi there',
      model: 'gpt-4o',
    })

    const messages = [...messageRepo._store.values()]
    const convMessages = messages.filter((m) => m.conversationId === conv.id)
    expect(convMessages.length).toBe(2)

    const userMsg = convMessages.find((m) => m.role === MessageRole.USER)
    const assistantMsg = convMessages.find(
      (m) => m.role === MessageRole.ASSISTANT,
    )
    expect(userMsg).toBeDefined()
    expect(userMsg!.content).toBe('Hi there')
    expect(assistantMsg).toBeDefined()
  })
})
