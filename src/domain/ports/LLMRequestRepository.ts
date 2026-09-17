export interface LLMRequestLog {
  id: string
  organizationId: string
  userId?: string
  requestId: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  durationMs: number
  status: 'success' | 'error'
  errorMessage?: string
  conversationId?: string
  createdAt: Date
}

export interface CreateLLMRequestLogParams {
  organizationId: string
  userId?: string
  requestId: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  durationMs: number
  status: 'success' | 'error'
  errorMessage?: string
  conversationId?: string
}

export interface UsageQueryParams {
  organizationId: string
  startDate?: Date
  endDate?: Date
  provider?: string
  model?: string
  limit: number
  cursor?: string
}

export interface LLMRequestRepository {
  create(params: CreateLLMRequestLogParams): Promise<LLMRequestLog>
  findByOrganizationId(
    params: UsageQueryParams,
  ): Promise<{ data: LLMRequestLog[]; nextCursor: string | null }>
  getSummary(
    organizationId: string,
    params: {
      startDate?: Date
      endDate?: Date
    },
  ): Promise<{
    totalRequests: number
    totalInputTokens: number
    totalOutputTokens: number
    totalTokens: number
    estimatedCost: number
  }>
}
