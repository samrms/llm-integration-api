import type { MessageRepository } from '../../domain/ports/MessageRepository.js'
import type { Message } from '../../domain/entities/Message.js'

export interface ListMessagesInput {
  organizationId: string
  conversationId: string
  limit: number
  cursor?: string
}

export interface ListMessagesOutput {
  data: Message[]
  nextCursor: string | null
}

export class ListMessagesUseCase {
  constructor(private readonly messageRepo: MessageRepository) {}

  async execute(input: ListMessagesInput): Promise<ListMessagesOutput> {
    return this.messageRepo.findByConversationId(
      input.conversationId,
      input.organizationId,
      { limit: input.limit, cursor: input.cursor },
    )
  }
}
