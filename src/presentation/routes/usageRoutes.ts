import type { FastifyInstance } from 'fastify'
import "@fastify/swagger";
import { createUsageController } from '../controllers/usageController.js'
import { createAuthHook } from '../hooks/auth.js'
import { createOrganizationAuthHook } from '../hooks/auth.js'
import type { TokenService } from '../../domain/ports/TokenService.js'
import type { APIKeyRepository } from '../../domain/ports/APIKeyRepository.js'
import type { UserRepository } from '../../domain/ports/UserRepository.js'
import type { OrganizationMemberRepository } from '../../domain/ports/OrganizationMemberRepository.js'
import type { CacheService } from '../../domain/ports/CacheService.js'

export interface UsageRoutesDeps {
  usage: ReturnType<typeof createUsageController>
  tokenService: TokenService
  apiKeyRepo: APIKeyRepository
  userRepo: UserRepository
  memberRepo: OrganizationMemberRepository
  cache: CacheService
}

export async function usageRoutes(
  fastify: FastifyInstance,
  deps: UsageRoutesDeps,
): Promise<void> {
  const authHook = createAuthHook(
    deps.tokenService,
    deps.apiKeyRepo,
    deps.userRepo,
    deps.memberRepo,
    deps.cache,
  )
  const orgAuthHook = createOrganizationAuthHook(deps.memberRepo)

  fastify.get(
    '/api/v1/organizations/:organizationId/usage',
    {
      preHandler: [authHook, orgAuthHook],
      schema: {
        params: {
          type: 'object',
          required: ['organizationId'],
          properties: {
            organizationId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            provider: { type: 'string' },
            model: { type: 'string' },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            cursor: { type: 'string' },
          },
        },
        tags: ['usage'],
        summary: 'Get usage records',
        security: [{ bearerAuth: [] }],
      },
    },
    deps.usage.getUsage.bind(deps.usage),
  )
}
