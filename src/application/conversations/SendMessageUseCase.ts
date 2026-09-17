import type { ConversationRepository } from '../../domain/ports/ConversationRepository.js'
import type { MessageRepository } from '../../domain/ports/MessageRepository.js'
import type { ModelRepository } from '../../domain/ports/ModelRepository.js'
import type { LLMProvider, LLMMessage } from '../../domain/ports/LLMProvider.js'
import type { LLMRequestRepository } from '../../domain/ports/LLMRequestRepository.js'
import { MessageRole } from '../../domain/entities/Message.js'
import type { Message } from '../../domain/entities/Message.js'
import { NotFoundError } from '../../domain/errors/AppError.js'

export interface SendMessageInput {
  organizationId: string
  conversationId: string
  userId: string
  content: string
  model?: string
}

export interface SendMessageOutput {
  userMessage: Message
  assistantMessage: Message
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
}

export class SendMessageUseCase {
  private readonly providers: Map<string, LLMProvider>

  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly messageRepo: MessageRepository,
    providers: LLMProvider[],
    private readonly modelRepo: ModelRepository,
    private readonly requestRepo: LLMRequestRepository,
  ) {
    this.providers = new Map(providers.map((p) => [p.name, p]))
  }

  async execute(input: SendMessageInput): Promise<SendMessageOutput> {
    // VerifyVerify conversation belongs to org
    const conversation = await this.conversationRepo.findById(
      input.organizationId,
      input.conversationId,
    )
    if (!conversation) {
      throw new NotFoundError('Conversation')
    }

    // Determine model
    const modelName = input.model ?? conversation.model ?? 'gpt-4o'
    const modelRecord = await this.modelRepo.findByModel(modelName)
    if (!modelRecord || !modelRecord.enabled) {
      throw new NotFoundError(`Model "${modelName}"`)
    }

    const provider = this.providers.get(modelRecord.provider)
    if (!provider) {
      throw new NotFoundError(`Provider "${modelRecord.provider}"`)
    }

    // Persist user message
    const userMessage = await this.messageRepo.create({
      conversationId: input.conversationId,
      organizationId: input.organizationId,
      role: MessageRole.USER,
      content: input.content,
    })

    // Load context (recent messages)
    const { data: recentMessages } =
      await this.messageRepo.findByConversationId(
        input.conversationId,
        input.organizationId,
        { limit: 20 },
      )

    // Build LLM messages (oldest first)
    const llmMessages: LLMMessage[] = recentMessages.reverse().map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }))

    // Call LLM
    const startTime = Date.now()
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2)}`

    try {
      const response = await provider.generate({
        model: modelName,
        messages: llmMessages,
      })

      const durationMs = Date.now() - startTime

      // Persist assistant message
      const assistantMessage = await this.messageRepo.create({
        conversationId: input.conversationId,
        organizationId: input.organizationId,
        role: MessageRole.ASSISTANT,
        content: response.content,
        tokenCount: response.usage.totalTokens,
      })

      // Log request
      await this.requestRepo.create({
        organizationId: input.organizationId,
        userId: input.userId,
        requestId,
        provider: response.provider,
        model: response.model,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        totalTokens: response.usage.totalTokens,
        durationMs,
        status: 'success',
        conversationId: input.conversationId,
      })

      // Update conversation model if not set
      if (!conversation.model) {
        await this.conversationRepo.update(conversation.id, {
          model: modelName,
        })
      }

      return {
        userMessage,
        assistantMessage,
        usage: response.usage,
      }
    } catch (error) {
      const durationMs = Date.now() - startTime
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'

      await this.requestRepo.create({
        organizationId: input.organizationId,
        userId: input.userId,
        requestId,
        provider: modelRecord.provider,
        model: modelName,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        durationMs,
        status: 'error',
        errorMessage,
        conversationId: input.conversationId,
      })

      throw error
    }
  }
}
