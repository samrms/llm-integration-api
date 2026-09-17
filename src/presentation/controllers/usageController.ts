import type { FastifyRequest, FastifyReply } from 'fastify'
import type { GetUsageUseCase } from '../../application/usage/GetUsageUseCase.js'

export interface UsageControllerDeps {
  getUsageUseCase: GetUsageUseCase
}

export function createUsageController(deps: UsageControllerDeps) {
  return {
    async getUsage(request: FastifyRequest, reply: FastifyReply) {
      const query = request.query as {
        startDate?: string
        endDate?: string
        provider?: string
        model?: string
        limit?: number
        cursor?: string
      }

      const result = await deps.getUsageUseCase.execute({
        organizationId: request.organizationId!,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        provider: query.provider,
        model: query.model,
        limit: query.limit ?? 20,
        cursor: query.cursor,
      })

      reply.send({
        data: result.data.map((log) => ({
          id: log.id,
          organizationId: log.organizationId,
          userId: log.userId,
          requestId: log.requestId,
          provider: log.provider,
          model: log.model,
          inputTokens: log.inputTokens,
          outputTokens: log.outputTokens,
          totalTokens: log.totalTokens,
          durationMs: log.durationMs,
          status: log.status,
          errorMessage: log.errorMessage,
          conversationId: log.conversationId,
          createdAt: log.createdAt.toISOString(),
        })),
        nextCursor: result.nextCursor,
        summary: result.summary,
      })
    },
  }
}
