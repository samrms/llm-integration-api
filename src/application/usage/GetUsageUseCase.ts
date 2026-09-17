import type { LLMRequestRepository } from '../../domain/ports/LLMRequestRepository.js'
import type { LLMRequestLog } from '../../domain/ports/LLMRequestRepository.js'

export interface GetUsageInput {
  organizationId: string
  startDate?: Date
  endDate?: Date
  provider?: string
  model?: string
  limit: number
  cursor?: string
}

export interface GetUsageOutput {
  data: LLMRequestLog[]
  nextCursor: string | null
  summary: {
    totalRequests: number
    totalInputTokens: number
    totalOutputTokens: number
    totalTokens: number
    estimatedCost: number
  }
}

export class GetUsageUseCase {
  constructor(private readonly requestRepo: LLMRequestRepository) {}

  async execute(input: GetUsageInput): Promise<GetUsageOutput> {
    const [data, summary] = await Promise.all([
      this.requestRepo.findByOrganizationId({
        organizationId: input.organizationId,
        startDate: input.startDate,
        endDate: input.endDate,
        provider: input.provider,
        model: input.model,
        limit: input.limit,
        cursor: input.cursor,
      }),
      this.requestRepo.getSummary(input.organizationId, {
        startDate: input.startDate,
        endDate: input.endDate,
      }),
    ])

    return {
      ...data,
      summary,
    }
  }
}
