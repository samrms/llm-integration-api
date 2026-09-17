import { eq, and, desc } from 'drizzle-orm'
import type { AppDatabase } from '../database/types.js'
import type {
  MessageRepository,
  CreateMessageParams,
} from '../../domain/ports/MessageRepository.js'
import { Message, type MessageRole } from '../../domain/entities/Message.js'
import { messages } from '../database/schema.js'

export class DrizzleMessageRepository implements MessageRepository {
  constructor(private readonly db: AppDatabase) {}

  private rowToMessage(row: typeof messages.$inferSelect): Message {
    return Message.reconstitute({
      id: row.id,
      conversationId: row.conversationId,
      organizationId: row.organizationId,
      role: row.role as MessageRole,
      content: row.content,
      tokenCount: row.tokenCount ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  }

  async findByConversationId(
    conversationId: string,
    organizationId: string,
    params: { limit: number; cursor?: string },
  ): Promise<{ data: Message[]; nextCursor: string | null }> {
    let query = this.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.organizationId, organizationId),
        ),
      )
      .orderBy(desc(messages.createdAt))
      .limit(params.limit + 1)

    const rows = await query
    const hasMore = rows.length > params.limit
    const data = hasMore ? rows.slice(0, params.limit) : rows

    return {
      data: data.map((row) => this.rowToMessage(row)),
      nextCursor: hasMore ? data[data.length - 1]!.id : null,
    }
  }

  async create(params: CreateMessageParams): Promise<Message> {
    const message = Message.create({
      conversationId: params.conversationId,
      organizationId: params.organizationId,
      role: params.role,
      content: params.content,
      tokenCount: params.tokenCount,
    })

    const [row] = await this.db
      .insert(messages)
      .values({
        id: message.id,
        conversationId: message.conversationId,
        organizationId: message.organizationId,
        role: message.role,
        content: message.content,
        tokenCount: message.tokenCount,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      })
      .returning()

    return this.rowToMessage(row!)
  }

  async countByConversationId(conversationId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: messages.id })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))

    return result ? 1 : 0
  }
}
