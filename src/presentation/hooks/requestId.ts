import type { FastifyRequest, FastifyReply } from 'fastify'
import { randomUUID } from 'node:crypto'

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string
  }
}

export async function requestIdHook(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const headerId = request.headers['x-request-id'] as string | undefined

  if (headerId) {
    // Validate: must be a UUID or safe string (max 128 chars)
    if (headerId.length > 128) {
      reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'X-Request-ID must be 128 characters or fewer',
        },
      })
      return
    }
    request.requestId = headerId
  } else {
    request.requestId = randomUUID()
  }

  reply.header('X-Request-ID', request.requestId)
}
