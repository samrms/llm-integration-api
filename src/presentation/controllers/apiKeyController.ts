import type { FastifyRequest, FastifyReply } from 'fastify'
import type { CreateAPIKeyUseCase } from '../../application/api-keys/CreateAPIKeyUseCase.js'
import type { ListAPIKeysUseCase } from '../../application/api-keys/ListAPIKeysUseCase.js'
import type { RevokeAPIKeyUseCase } from '../../application/api-keys/RevokeAPIKeyUseCase.js'
import type { APIKeyScope } from '../../domain/entities/APIKey.js'

export interface APIKeyControllerDeps {
  createAPIKeyUseCase: CreateAPIKeyUseCase
  listAPIKeysUseCase: ListAPIKeysUseCase
  revokeAPIKeyUseCase: RevokeAPIKeyUseCase
}

function serializeAPIKey(key: {
  id: string
  organizationId: string
  name: string
  prefix: string
  scopes: string[]
  expiresAt: Date | null
  revokedAt: Date | null
  lastUsedAt: Date | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: key.id,
    organizationId: key.organizationId,
    name: key.name,
    prefix: key.prefix,
    scopes: key.scopes,
    expiresAt: key.expiresAt?.toISOString() ?? null,
    revokedAt: key.revokedAt?.toISOString() ?? null,
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    createdAt: key.createdAt.toISOString(),
    updatedAt: key.updatedAt.toISOString(),
  }
}

export function createAPIKeyController(deps: APIKeyControllerDeps) {
  return {
    async create(request: FastifyRequest, reply: FastifyReply) {
      const body = request.body as {
        name: string
        scopes: APIKeyScope[]
        expiresAt?: string
      }
      const params = request.params as { organizationId: string }

      const result = await deps.createAPIKeyUseCase.execute({
        organizationId: params.organizationId,
        userId: request.userId!,
        name: body.name,
        scopes: body.scopes,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      })

      reply.code(201).send({
        rawKey: result.rawKey,
        apiKey: serializeAPIKey(result.apiKey),
      })
    },

    async list(request: FastifyRequest, reply: FastifyReply) {
      const params = request.params as { organizationId: string }

      const keys = await deps.listAPIKeysUseCase.execute(params.organizationId)

      reply.send(keys.map(serializeAPIKey))
    },

    async revoke(request: FastifyRequest, reply: FastifyReply) {
      const params = request.params as { organizationId: string; id: string }

      await deps.revokeAPIKeyUseCase.execute({
        organizationId: params.organizationId,
        apiKeyId: params.id,
        userId: request.userId!,
      })

      reply.code(204).send()
    },
  }
}
