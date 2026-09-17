export interface RefreshTokenRecord {
  id: string
  userId: string
  organizationId?: string | null
  tokenHash: string
  family: string
  expiresAt: Date
  revokedAt: Date | null
  createdAt: Date
}

export interface RefreshTokenRepository {
  create(params: {
    userId: string
    organizationId?: string
    tokenHash: string
    family: string
    expiresAt: Date
  }): Promise<RefreshTokenRecord>
  findByTokenHash(tokenHash: string): Promise<RefreshTokenRecord | null>
  revokeByFamily(family: string): Promise<void>
  revokeById(id: string): Promise<void>
  deleteExpired(): Promise<number>
}
