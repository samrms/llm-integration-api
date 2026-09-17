export interface IdempotencyRecord {
  id: string
  organizationId: string
  key: string
  requestFingerprint: string
  status: 'pending' | 'completed' | 'error'
  responseStatusCode?: number
  responseBody?: string
  expiresAt: Date
  createdAt: Date
}

export interface IdempotencyRepository {
  findOrCreate(params: {
    organizationId: string
    key: string
    requestFingerprint: string
    expiresAt: Date
  }): Promise<{ record: IdempotencyRecord; isDuplicate: boolean }>
  complete(id: string, statusCode: number, body: string): Promise<void>
  fail(id: string, statusCode: number, body: string): Promise<void>
  findPendingByKey(key: string): Promise<IdempotencyRecord | null>
  deleteExpired(): Promise<number>
}
