import type { Conversation } from '../entities/Conversation.js'

export interface CreateConversationParams {
  organizationId: string
  userId: string
  title?: string
  model?: string
}

export interface ConversationRepository {
  findById(organizationId: string, id: string): Promise<Conversation | null>
  findByOrganizationId(
    organizationId: string,
    params: { limit: number; cursor?: string },
  ): Promise<{ data: Conversation[]; nextCursor: string | null }>
  create(params: CreateConversationParams): Promise<Conversation>
  update(
    id: string,
    data: Partial<Pick<Conversation, 'title' | 'model'>>,
  ): Promise<Conversation>
  delete(organizationId: string, id: string): Promise<void>
}
