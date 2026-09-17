import { BaseEntity } from './BaseEntity.js'

export enum APIKeyScope {
  COMPLETIONS_WRITE = 'completions:write',
  CONVERSATIONS_READ = 'conversations:read',
  CONVERSATIONS_WRITE = 'conversations:write',
  USAGE_READ = 'usage:read',
  MODELS_READ = 'models:read',
}

export interface APIKeyProps {
  id?: string
  organizationId: string
  name: string
  prefix: string
  keyHash: string
  scopes: APIKeyScope[]
  expiresAt?: Date | null
  revokedAt?: Date | null
  lastUsedAt?: Date | null
  createdAt?: Date
  updatedAt?: Date
}

export class APIKey extends BaseEntity {
  public organizationId: string
  public name: string
  public prefix: string
  public keyHash: string
  public scopes: APIKeyScope[]
  public expiresAt: Date | null
  public revokedAt: Date | null
  public lastUsedAt: Date | null

  private constructor(props: APIKeyProps) {
    super({
      id: props.id,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    })
    this.organizationId = props.organizationId
    this.name = props.name
    this.prefix = props.prefix
    this.keyHash = props.keyHash
    this.scopes = [...props.scopes]
    this.expiresAt = props.expiresAt ?? null
    this.revokedAt = props.revokedAt ?? null
    this.lastUsedAt = props.lastUsedAt ?? null
  }

  public static create(props: APIKeyProps): APIKey {
    if (!props.organizationId) {
      throw new Error('Organization ID is required')
    }
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('API key name is required')
    }
    if (!props.keyHash) {
      throw new Error('Key hash is required')
    }
    if (props.scopes.length === 0) {
      throw new Error('At least one scope is required')
    }
    return new APIKey(props)
  }

  public static reconstitute(props: APIKeyProps & { id: string }): APIKey {
    return new APIKey(props)
  }

  public get isRevoked(): boolean {
    return this.revokedAt !== null
  }

  public get isExpired(): boolean {
    return this.expiresAt !== null && this.expiresAt < new Date()
  }

  public get isActive(): boolean {
    return !this.isRevoked && !this.isExpired
  }

  public hasScope(scope: APIKeyScope): boolean {
    return this.scopes.includes(scope)
  }

  public revoke(): void {
    this.revokedAt = new Date()
    this.touch()
  }

  public recordUsage(): void {
    this.lastUsedAt = new Date()
    this.touch()
  }
}
