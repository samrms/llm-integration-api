import type { APIKey, APIKeyScope } from '../entities/APIKey.js'

export interface CreateAPIKeyParams {
  organizationId: string
  name: string
  prefix: string
  keyHash: string
  scopes: APIKeyScope[]
  expiresAt?: Date | null
}

export interface APIKeyRepository {
  findById(id: string): Promise<APIKey | null>
  findByOrganizationId(organizationId: string): Promise<APIKey[]>
  findByPrefix(prefix: string): Promise<APIKey | null>
  create(params: CreateAPIKeyParams): Promise<APIKey>
  updateLastUsed(id: string): Promise<void>
  revoke(id: string): Promise<void>
  delete(id: string): Promise<void>
}
