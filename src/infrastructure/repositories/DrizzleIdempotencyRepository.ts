import { eq, and } from 'drizzle-orm'
import type { AppDatabase } from '../database/types.js'
import type { IdempotencyRepository } from '../../domain/ports/IdempotencyRepository.js'
import { idempotencyKeys } from '../database/schema.js'

export class DrizzleIdempotencyRepository implements IdempotencyRepository {
  constructor(private readonly db: AppDatabase) {}

  async findOrCreate(params: {
    organizationId: string
    key: string
    requestFingerprint: string
    expiresAt: Date
  }) {
    // Try to find existing
    const [existing] = await this.db
      .select()
      .from(idempotencyKeys)
      .where(
        and(
          eq(idempotencyKeys.key, params.key),
          eq(idempotencyKeys.organizationId, params.organizationId),
        ),
      )
      .limit(1)

    if (existing) {
      return {
        record: {
          id: existing.id,
          organizationId: existing.organizationId ?? '',
          key: existing.key,
          requestFingerprint: existing.requestFingerprint,
          status: existing.status as 'pending' | 'completed' | 'error',
          responseStatusCode: existing.responseStatusCode ?? undefined,
          responseBody: existing.responseBody ?? undefined,
          expiresAt: existing.expiresAt,
          createdAt: existing.createdAt,
        },
        isDuplicate: true,
      }
    }

    // Create new
    const [created] = await this.db
      .insert(idempotencyKeys)
      .values({
        organizationId: params.organizationId,
        key: params.key,
        requestFingerprint: params.requestFingerprint,
        status: 'pending',
        expiresAt: params.expiresAt,
      })
      .returning()

    return {
      record: {
        id: created!.id,
        organizationId: created!.organizationId ?? '',
        key: created!.key,
        requestFingerprint: created!.requestFingerprint,
        status: created!.status as 'pending' | 'completed' | 'error',
        responseStatusCode: created!.responseStatusCode ?? undefined,
        responseBody: created!.responseBody ?? undefined,
        expiresAt: created!.expiresAt,
        createdAt: created!.createdAt,
      },
      isDuplicate: false,
    }
  }

  async complete(id: string, statusCode: number, body: string): Promise<void> {
    await this.db
      .update(idempotencyKeys)
      .set({
        status: 'completed',
        responseStatusCode: statusCode,
        responseBody: body,
      })
      .where(eq(idempotencyKeys.id, id))
  }

  async fail(id: string, statusCode: number, body: string): Promise<void> {
    await this.db
      .update(idempotencyKeys)
      .set({
        status: 'error',
        responseStatusCode: statusCode,
        responseBody: body,
      })
      .where(eq(idempotencyKeys.id, id))
  }

  async findPendingByKey(key: string) {
    const [row] = await this.db
      .select()
      .from(idempotencyKeys)
      .where(eq(idempotencyKeys.key, key))
      .limit(1)

    if (!row) return null

    return {
      id: row.id,
      organizationId: row.organizationId ?? '',
      key: row.key,
      requestFingerprint: row.requestFingerprint,
      status: row.status as 'pending' | 'completed' | 'error',
      responseStatusCode: row.responseStatusCode ?? undefined,
      responseBody: row.responseBody ?? undefined,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    }
  }

  async deleteExpired(): Promise<number> {
    const result = await this.db
      .delete(idempotencyKeys)
      .where(eq(idempotencyKeys.expiresAt, new Date()))

    return result.rowCount ?? 0
  }
}
