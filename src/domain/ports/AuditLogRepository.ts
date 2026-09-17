export interface AuditLogEntry {
  id: string
  organizationId?: string | null
  userId?: string | null
  action: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

export interface CreateAuditLogParams {
  organizationId?: string
  userId?: string
  action: string
  metadata?: Record<string, unknown>
}

export interface AuditLogRepository {
  create(params: CreateAuditLogParams): Promise<AuditLogEntry>
  findByOrganizationId(
    organizationId: string,
    params: { limit: number; cursor?: string },
  ): Promise<{ data: AuditLogEntry[]; nextCursor: string | null }>
}
