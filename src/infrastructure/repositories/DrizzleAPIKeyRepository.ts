import { eq } from 'drizzle-orm'
import type { AppDatabase } from '../database/types.js'
import type {
  APIKeyRepository,
  CreateAPIKeyParams,
} from '../../domain/ports/APIKeyRepository.js'
import { APIKey, type APIKeyScope } from '../../domain/entities/APIKey.js'
import { apiKeys } from '../database/schema.js'

export class DrizzleAPIKeyRepository implements APIKeyRepository {
  constructor(private readonly db: AppDatabase) {}

  async findById(id: string): Promise<APIKey | null> {
    const [row] = await this.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .limit(1)

    if (!row) return null

    return APIKey.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      prefix: row.prefix,
      keyHash: row.keyHash,
      scopes: row.scopes as APIKeyScope[],
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
      lastUsedAt: row.lastUsedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  }

  async findByOrganizationId(organizationId: string): Promise<APIKey[]> {
    const rows = await this.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.organizationId, organizationId))

    return rows.map((row) =>
      APIKey.reconstitute({
        id: row.id,
        organizationId: row.organizationId,
        name: row.name,
        prefix: row.prefix,
        keyHash: row.keyHash,
        scopes: row.scopes as APIKeyScope[],
        expiresAt: row.expiresAt,
        revokedAt: row.revokedAt,
        lastUsedAt: row.lastUsedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }),
    )
  }

  async findByPrefix(prefix: string): Promise<APIKey | null> {
    const [row] = await this.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.prefix, prefix))
      .limit(1)

    if (!row) return null

    return APIKey.reconstitute({
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      prefix: row.prefix,
      keyHash: row.keyHash,
      scopes: row.scopes as APIKeyScope[],
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
      lastUsedAt: row.lastUsedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  }

  async create(params: CreateAPIKeyParams): Promise<APIKey> {
    const apiKey = APIKey.create({
      organizationId: params.organizationId,
      name: params.name,
      prefix: params.prefix,
      keyHash: params.keyHash,
      scopes: params.scopes,
      expiresAt: params.expiresAt,
    })

    const [row] = await this.db
      .insert(apiKeys)
      .values({
        id: apiKey.id,
        organizationId: apiKey.organizationId,
        name: apiKey.name,
        prefix: apiKey.prefix,
        keyHash: apiKey.keyHash,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
        updatedAt: apiKey.updatedAt,
      })
      .returning()

    return APIKey.reconstitute({
      id: row!.id,
      organizationId: row!.organizationId,
      name: row!.name,
      prefix: row!.prefix,
      keyHash: row!.keyHash,
      scopes: row!.scopes as APIKeyScope[],
      expiresAt: row!.expiresAt,
      revokedAt: row!.revokedAt,
      lastUsedAt: row!.lastUsedAt,
      createdAt: row!.createdAt,
      updatedAt: row!.updatedAt,
    })
  }

  async updateLastUsed(id: string): Promise<void> {
    await this.db
      .update(apiKeys)
      .set({ lastUsedAt: new Date(), updatedAt: new Date() })
      .where(eq(apiKeys.id, id))
  }

  async revoke(id: string): Promise<void> {
    await this.db
      .update(apiKeys)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(apiKeys.id, id))
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(apiKeys).where(eq(apiKeys.id, id))
  }
}
