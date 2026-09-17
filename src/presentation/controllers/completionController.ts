import type { FastifyRequest, FastifyReply } from 'fastify'
import type { CompletionUseCase } from '../../application/completions/CompletionUseCase.js'
import type { StreamingCompletionUseCase } from '../../application/completions/StreamingCompletionUseCase.js'

export interface CompletionControllerDeps {
  completionUseCase: CompletionUseCase
  streamingCompletionUseCase: StreamingCompletionUseCase
}

export function createCompletionController(deps: CompletionControllerDeps) {
  return {
    async complete(request: FastifyRequest, reply: FastifyReply) {
      const body = request.body as {
        model: string
        messages: Array<{
          role: 'system' | 'user' | 'assistant'
          content: string
        }>
        temperature?: number
        maxTokens?: number
        idempotencyKey?: string
      }

      const result = await deps.completionUseCase.execute({
        organizationId: request.organizationId!,
        userId: request.userId,
        requestId: request.requestId,
        model: body.model,
        messages: body.messages,
        temperature: body.temperature,
        maxTokens: body.maxTokens,
        idempotencyKey: body.idempotencyKey,
      })

      reply.send({
        id: result.id,
        provider: result.provider,
        model: result.model,
        content: result.content,
        finishReason: result.finishReason,
        usage: result.usage,
      })
    },

    async stream(request: FastifyRequest, reply: FastifyReply) {
      const body = request.body as {
        model: string
        messages: Array<{
          role: 'system' | 'user' | 'assistant'
          content: string
        }>
        temperature?: number
        maxTokens?: number
      }

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Request-ID': request.requestId,
      })

      try {
        const stream = deps.streamingCompletionUseCase.executeStream({
          organizationId: request.organizationId!,
          userId: request.userId,
          requestId: request.requestId,
          model: body.model,
          messages: body.messages,
          temperature: body.temperature,
          maxTokens: body.maxTokens,
        })

        for await (const chunk of stream) {
          const data = JSON.stringify({
            id: chunk.id,
            provider: chunk.provider,
            model: chunk.model,
            delta: chunk.delta,
            finishReason: chunk.finishReason,
            usage: chunk.usage,
          })

          reply.raw.write(`data: ${data}\n\n`)
        }

        reply.raw.write('data: [DONE]\n\n')
      } catch (error) {
        const errorData = JSON.stringify({
          error: {
            code:
              error instanceof Error ? error.constructor.name : 'UNKNOWN_ERROR',
            message: error instanceof Error ? error.message : 'Stream failed',
          },
        })
        reply.raw.write(`data: ${errorData}\n\n`)
      } finally {
        reply.raw.end()
      }
    },
  }
}
