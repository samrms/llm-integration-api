import { eq, and, gte, lte, desc } from 'drizzle-orm'
import type { AppDatabase } from '../database/types.js'
import type {
  LLMRequestRepository,
  LLMRequestLog,
  CreateLLMRequestLogParams,
  UsageQueryParams,
} from '../../domain/ports/LLMRequestRepository.js'
import { llmRequests } from '../database/schema.js'

export class DrizzleLLMRequestRepository implements LLMRequestRepository {
  constructor(private readonly db: AppDatabase) {}

  private rowToLog(row: typeof llmRequests.$inferSelect): LLMRequestLog {
    return {
      id: row.id,
      organizationId: row.organizationId ?? '',
      userId: row.userId ?? undefined,
      requestId: row.requestId,
      provider: row.provider,
      model: row.model,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      totalTokens: row.totalTokens,
      durationMs: row.durationMs,
      status: row.status as 'success' | 'error',
      errorMessage: row.errorMessage ?? undefined,
      conversationId: row.conversationId ?? undefined,
      createdAt: row.createdAt,
    }
  }

  async create(params: CreateLLMRequestLogParams): Promise<LLMRequestLog> {
    const [row] = await this.db
      .insert(llmRequests)
      .values({
        organizationId: params.organizationId,
        userId: params.userId,
        requestId: params.requestId,
        provider: params.provider,
        model: params.model,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        totalTokens: params.totalTokens,
        durationMs: params.durationMs,
        status: params.status,
        errorMessage: params.errorMessage,
        conversationId: params.conversationId,
      })
      .returning()

    return this.rowToLog(row!)
  }

  async findByOrganizationId(
    params: UsageQueryParams,
  ): Promise<{ data: LLMRequestLog[]; nextCursor: string | null }> {
    const conditions = [eq(llmRequests.organizationId, params.organizationId)]

    if (params.startDate) {
      conditions.push(gte(llmRequests.createdAt, params.startDate))
    }
    if (params.endDate) {
      conditions.push(lte(llmRequests.createdAt, params.endDate))
    }
    if (params.provider) {
      conditions.push(eq(llmRequests.provider, params.provider))
    }
    if (params.model) {
      conditions.push(eq(llmRequests.model, params.model))
    }

    const rows = await this.db
      .select()
      .from(llmRequests)
      .where(and(...conditions))
      .orderBy(desc(llmRequests.createdAt))
      .limit(params.limit + 1)

    const hasMore = rows.length > params.limit
    const data = hasMore ? rows.slice(0, params.limit) : rows

    return {
      data: data.map((row) => this.rowToLog(row)),
      nextCursor: hasMore ? data[data.length - 1]!.id : null,
    }
  }

  async getSummary(
    organizationId: string,
    params: { startDate?: Date; endDate?: Date },
  ): Promise<{
    totalRequests: number
    totalInputTokens: number
    totalOutputTokens: number
    totalTokens: number
    estimatedCost: number
  }> {
    const conditions = [eq(llmRequests.organizationId, organizationId)]

    if (params.startDate) {
      conditions.push(gte(llmRequests.createdAt, params.startDate))
    }
    if (params.endDate) {
      conditions.push(lte(llmRequests.createdAt, params.endDate))
    }

    const rows = await this.db
      .select({
        inputTokens: llmRequests.inputTokens,
        outputTokens: llmRequests.outputTokens,
        totalTokens: llmRequests.totalTokens,
      })
      .from(llmRequests)
      .where(and(...conditions))

    let totalRequests = rows.length
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let totalTokens = 0

    for (const row of rows) {
      totalInputTokens += row.inputTokens
      totalOutputTokens += row.outputTokens
      totalTokens += row.totalTokens
    }

    const estimatedCost = (totalTokens / 1000) * 0.01

    return {
      totalRequests,
      totalInputTokens,
      totalOutputTokens,
      totalTokens,
      estimatedCost,
    }
  }
}
