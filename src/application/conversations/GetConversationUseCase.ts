import type { ConversationRepository } from '../../domain/ports/ConversationRepository.js'
import type { Conversation } from '../../domain/entities/Conversation.js'
import { NotFoundError } from '../../domain/errors/AppError.js'

export class GetConversationUseCase {
  constructor(private readonly conversationRepo: ConversationRepository) {}

  async execute(
    organizationId: string,
    conversationId: string,
  ): Promise<Conversation> {
    const conversation = await this.conversationRepo.findById(
      organizationId,
      conversationId,
    )
    if (!conversation) {
      throw new NotFoundError('Conversation')
    }
    return conversation
  }
}
