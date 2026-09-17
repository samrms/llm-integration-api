import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify'
import { AppError } from '../../domain/errors/AppError.js'

interface AppLogger {
  error: (msg: string, obj?: unknown) => void
}

export function createErrorHandler(logger: AppLogger) {
  return async function errorHandler(
    error: FastifyError | AppError | Error,
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    // AppError subclasses — structured error responses
    if (error instanceof AppError) {
      const body = error.toJSON()
      if (error.requestId) {
        body.error.requestId = error.requestId
      }

      reply.code(error.statusCode).send(body)
      return
    }

    // Fastify validation errors (schema validation)
    if ('validation' in error && error.validation) {
      reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          ...(request.requestId ? { requestId: request.requestId } : {}),
        },
      })
      return
    }

    // Fastify errors with statusCode
    if ('statusCode' in error && typeof error.statusCode === 'number') {
      if (error.statusCode === 404) {
        reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: error.message || 'Not found',
            ...(request.requestId ? { requestId: request.requestId } : {}),
          },
        })
        return
      }

      if (error.statusCode === 429) {
        reply.code(429).send({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded',
            ...(request.requestId ? { requestId: request.requestId } : {}),
          },
        })
        return
      }
    }

    // All other errors — generic 500
    logger.error('Unhandled error', {
      error: error.message,
      stack: error.stack,
      requestId: request.requestId,
    })

    reply.code(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        ...(request.requestId ? { requestId: request.requestId } : {}),
      },
    })
  }
}
