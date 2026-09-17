import type { ConversationRepository } from '../../domain/ports/ConversationRepository.js'
import type { Conversation } from '../../domain/entities/Conversation.js'

export interface CreateConversationInput {
  organizationId: string
  userId: string
  title?: string
  model?: string
}

export class CreateConversationUseCase {
  constructor(private readonly conversationRepo: ConversationRepository) {}

  async execute(input: CreateConversationInput): Promise<Conversation> {
    return this.conversationRepo.create({
      organizationId: input.organizationId,
      userId: input.userId,
      title: input.title,
      model: input.model,
    })
  }
}
