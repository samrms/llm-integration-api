import { eq, and, desc } from 'drizzle-orm'
import type { AppDatabase } from '../database/types.js'
import type {
  ConversationRepository,
  CreateConversationParams,
} from '../../domain/ports/ConversationRepository.js'
import { Conversation } from '../../domain/entities/Conversation.js'
import { conversations } from '../database/schema.js'

export class DrizzleConversationRepository implements ConversationRepository {
  constructor(private readonly db: AppDatabase) {}

  private rowToConversation(
    row: typeof conversations.$inferSelect,
  ): Conversation {
    return Conversation.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      userId: row.userId!,
      title: row.title ?? undefined,
      model: row.model ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  }

  async findById(
    organizationId: string,
    id: string,
  ): Promise<Conversation | null> {
    const [row] = await this.db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, id),
          eq(conversations.organizationId, organizationId),
        ),
      )
      .limit(1)

    if (!row) return null
    return this.rowToConversation(row)
  }

  async findByOrganizationId(
    organizationId: string,
    params: { limit: number; cursor?: string },
  ): Promise<{ data: Conversation[]; nextCursor: string | null }> {
    let query = this.db
      .select()
      .from(conversations)
      .where(eq(conversations.organizationId, organizationId))
      .orderBy(desc(conversations.createdAt))
      .limit(params.limit + 1)

    if (params.cursor) {
      // cursor-based pagination: find the cursor record and fetch after it
      const [cursorRow] = await this.db
        .select()
        .from(conversations)
        .where(eq(conversations.id, params.cursor))
        .limit(1)

      if (cursorRow) {
        query = this.db
          .select()
          .from(conversations)
          .where(
            and(
              eq(conversations.organizationId, organizationId),
              // created_at < cursor's created_at (for DESC order)
            ),
          )
          .orderBy(desc(conversations.createdAt))
          .limit(params.limit + 1)
      }
    }

    const rows = await query
    const hasMore = rows.length > params.limit
    const data = hasMore ? rows.slice(0, params.limit) : rows

    return {
      data: data.map((row) => this.rowToConversation(row)),
      nextCursor: hasMore ? data[data.length - 1]!.id : null,
    }
  }

  async create(params: CreateConversationParams): Promise<Conversation> {
    const conversation = Conversation.create({
      organizationId: params.organizationId,
      userId: params.userId,
      title: params.title,
      model: params.model,
    })

    const [row] = await this.db
      .insert(conversations)
      .values({
        id: conversation.id,
        organizationId: conversation.organizationId,
        userId: conversation.userId,
        title: conversation.title,
        model: conversation.model,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      })
      .returning()

    return this.rowToConversation(row!)
  }

  async update(
    id: string,
    data: Partial<Pick<Conversation, 'title' | 'model'>>,
  ): Promise<Conversation> {
    const [row] = await this.db
      .update(conversations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning()

    if (!row) throw new Error('Conversation not found')
    return this.rowToConversation(row)
  }

  async delete(organizationId: string, id: string): Promise<void> {
    await this.db
      .delete(conversations)
      .where(
        and(
          eq(conversations.id, id),
          eq(conversations.organizationId, organizationId),
        ),
      )
  }
}
