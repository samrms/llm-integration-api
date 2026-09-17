import { eq, and, desc, sql } from 'drizzle-orm';
import type { AppDatabase } from '../database/types.js';
import type {
  AuditLogRepository,
  CreateAuditLogParams,
} from '../../domain/ports/AuditLogRepository.js';
import { auditLogs } from '../database/schema.js';
import { randomUUID } from 'node:crypto';

export class DrizzleAuditLogRepository implements AuditLogRepository {
  constructor(private readonly db: AppDatabase) {}

  async create(params: CreateAuditLogParams) {
    const [row] = await this.db
      .insert(auditLogs)
      .values({
        id: randomUUID(),
        organizationId: params.organizationId ?? null,
        userId: params.userId ?? null,
        action: params.action,
        metadata: params.metadata ?? null,
      })
      .returning();

    return {
      id: row!.id,
      organizationId: row!.organizationId,
      userId: row!.userId,
      action: row!.action,
      metadata: (row!.metadata as Record<string, unknown>) ?? undefined,
      createdAt: row!.createdAt,
    };
  }

  async findByOrganizationId(
    organizationId: string,
    params: { limit: number; cursor?: string },
  ) {
    let whereCondition = eq(auditLogs.organizationId, organizationId);

    if (params.cursor) {
      whereCondition = and(
        whereCondition,
        sql`${auditLogs.createdAt} < (SELECT created_at FROM audit_logs WHERE id = ${params.cursor})`,
      )!;
    }

    const rows = await this.db
      .select()
      .from(auditLogs)
      .where(whereCondition)
      .orderBy(desc(auditLogs.createdAt))
      .limit(params.limit + 1);

    const hasMore = rows.length > params.limit;
    const data = hasMore ? rows.slice(0, params.limit) : rows;

    return {
      data: data.map((row) => ({
        id: row.id,
        organizationId: row.organizationId,
        userId: row.userId,
        action: row.action,
        metadata: (row.metadata as Record<string, unknown>) ?? undefined,
        createdAt: row.createdAt,
      })),
      nextCursor: hasMore ? data[data.length - 1]!.id : null,
    };
  }
}
