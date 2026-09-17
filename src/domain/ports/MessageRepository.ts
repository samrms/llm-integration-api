import type { Message, MessageRole } from '../entities/Message.js'

export interface CreateMessageParams {
  conversationId: string
  organizationId: string
  role: MessageRole
  content: string
  tokenCount?: number
}

export interface MessageRepository {
  findByConversationId(
    conversationId: string,
    organizationId: string,
    params: { limit: number; cursor?: string },
  ): Promise<{ data: Message[]; nextCursor: string | null }>
  create(params: CreateMessageParams): Promise<Message>
  countByConversationId(conversationId: string): Promise<number>
}
