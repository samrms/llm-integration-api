import { eq } from 'drizzle-orm'
import type { AppDatabase } from '../database/types.js'
import type { RefreshTokenRepository } from '../../domain/ports/RefreshTokenRepository.js'
import { refreshTokens } from '../database/schema.js'

export class DrizzleRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly db: AppDatabase) {}

  async create(params: {
    userId: string
    organizationId?: string
    tokenHash: string
    family: string
    expiresAt: Date
  }) {
    const [row] = await this.db
      .insert(refreshTokens)
      .values({
        userId: params.userId,
        organizationId: params.organizationId ?? null,
        tokenHash: params.tokenHash,
        family: params.family,
        expiresAt: params.expiresAt,
      })
      .returning()

    return {
      id: row!.id,
      userId: row!.userId,
      organizationId: row!.organizationId ?? undefined,
      tokenHash: row!.tokenHash,
      family: row!.family,
      expiresAt: row!.expiresAt,
      revokedAt: row!.revokedAt,
      createdAt: row!.createdAt,
    }
  }

  async findByTokenHash(tokenHash: string) {
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1)

    if (!row) return null

    return {
      id: row.id,
      userId: row.userId,
      organizationId: row.organizationId ?? undefined,
      tokenHash: row.tokenHash,
      family: row.family,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
      createdAt: row.createdAt,
    }
  }

  async revokeByFamily(family: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.family, family))
  }

  async revokeById(id: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, id))
  }

  async deleteExpired(): Promise<number> {
    const result = await this.db
      .delete(refreshTokens)
      .where(eq(refreshTokens.expiresAt, new Date()))

    return result.rowCount ?? 0
  }
}
