import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import "@fastify/swagger";
import { createOrganizationController } from '../controllers/organizationController.js'
import {
  createOrganizationRequest,
  addMemberRequest,
} from '../schemas/organizations.js'
import { createAuthHook } from '../hooks/auth.js'
import { createOrganizationAuthHook } from '../hooks/auth.js'
import type { TokenService } from '../../domain/ports/TokenService.js'
import type { APIKeyRepository } from '../../domain/ports/APIKeyRepository.js'
import type { UserRepository } from '../../domain/ports/UserRepository.js'
import type { OrganizationMemberRepository } from '../../domain/ports/OrganizationMemberRepository.js'
import type { CacheService } from '../../domain/ports/CacheService.js'

export interface OrganizationRoutesDeps {
  org: ReturnType<typeof createOrganizationController>
  tokenService: TokenService
  apiKeyRepo: APIKeyRepository
  userRepo: UserRepository
  memberRepo: OrganizationMemberRepository
  cache: CacheService
}

export async function organizationRoutes(
  fastify: FastifyInstance,
  deps: OrganizationRoutesDeps,
): Promise<void> {
  const authHook = createAuthHook(
    deps.tokenService,
    deps.apiKeyRepo,
    deps.userRepo,
    deps.memberRepo,
    deps.cache,
  )
  const orgAuthHook = createOrganizationAuthHook(deps.memberRepo)

  fastify.post(
    '/api/v1/organizations',
    {
      preHandler: [authHook],
      schema: {
        body: createOrganizationRequest,
        tags: ['organizations'],
        summary: 'Create an organization',
        security: [{ bearerAuth: [] }],
      },
    },
    deps.org.create.bind(deps.org),
  )

  fastify.get(
    '/api/v1/organizations',
    {
      preHandler: [authHook],
      schema: {
        tags: ['organizations'],
        summary: 'List organizations',
        security: [{ bearerAuth: [] }],
      },
    },
    deps.org.list.bind(deps.org),
  )

  fastify.post(
    '/api/v1/organizations/:organizationId/members',
    {
      preHandler: [authHook, orgAuthHook],
      schema: {
        params: z.object({organizationId: z.string().uuid()}),
        body: addMemberRequest,
        tags: ['organizations'],
        summary: 'Add a member to an organization',
        security: [{ bearerAuth: [] }],
      },
    },
    deps.org.addMember.bind(deps.org),
  )

  fastify.delete(
    '/api/v1/organizations/:organizationId/members/:userId',
    {
      preHandler: [authHook, orgAuthHook],
      schema: {
        params: z.object({organizationId: z.string().uuid(), userId: z.string().uuid()}),
        tags: ['organizations'],
        summary: 'Remove a member from an organization',
        security: [{ bearerAuth: [] }],
      },
    },
    deps.org.removeMember.bind(deps.org),
  )
}
