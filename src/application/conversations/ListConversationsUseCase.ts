import type { ConversationRepository } from '../../domain/ports/ConversationRepository.js'
import type { Conversation } from '../../domain/entities/Conversation.js'

export interface ListConversationsInput {
  organizationId: string
  limit: number
  cursor?: string
}

export interface ListConversationsOutput {
  data: Conversation[]
  nextCursor: string | null
}

export class ListConversationsUseCase {
  constructor(private readonly conversationRepo: ConversationRepository) {}

  async execute(
    input: ListConversationsInput,
  ): Promise<ListConversationsOutput> {
    return this.conversationRepo.findByOrganizationId(input.organizationId, {
      limit: input.limit,
      cursor: input.cursor,
    })
  }
}
