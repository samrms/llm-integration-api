import type { ConversationRepository } from '../../domain/ports/ConversationRepository.js'
import type { MessageRepository } from '../../domain/ports/MessageRepository.js'
import { NotFoundError } from '../../domain/errors/AppError.js'

export class DeleteConversationUseCase {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    messageRepo: MessageRepository,
  ) {
    // messageRepo is accepted for future use (bulk message deletion).
    // Currently relies on database cascading deletes.
    void messageRepo
  }

  async execute(
    params: { organizationId: string; conversationId: string },
  ): Promise<void> {
    const conversation = await this.conversationRepo.findById(
      params.organizationId,
      params.conversationId,
    )
    if (!conversation) {
      throw new NotFoundError('Conversation')
    }

    // Delete the conversation and rely on database cascading deletes for messages.
    // If cascading is not configured, messages will become orphaned.
    await this.conversationRepo.delete(
      params.organizationId,
      params.conversationId,
    )
  }
}
