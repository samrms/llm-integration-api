import type { FastifyInstance } from 'fastify';
import "@fastify/swagger";
import { createAPIKeyController } from '../controllers/apiKeyController.js';
import { createAPIKeyRequest } from '../schemas/api-keys.js';
import { createAuthHook } from '../hooks/auth.js';
import { createOrganizationAuthHook } from '../hooks/auth.js';
import type { TokenService } from '../../domain/ports/TokenService.js';
import type { APIKeyRepository } from '../../domain/ports/APIKeyRepository.js';
import type { UserRepository } from '../../domain/ports/UserRepository.js';
import type { OrganizationMemberRepository } from '../../domain/ports/OrganizationMemberRepository.js';
import type { CacheService } from '../../domain/ports/CacheService.js';

export interface APIKeyRoutesDeps {
  apiKey: ReturnType<typeof createAPIKeyController>;
  tokenService: TokenService;
  apiKeyRepo: APIKeyRepository;
  userRepo: UserRepository;
  memberRepo: OrganizationMemberRepository;
  cache: CacheService;
}

export async function apiKeyRoutes(
  fastify: FastifyInstance,
  deps: APIKeyRoutesDeps,
): Promise<void> {
  const authHook = createAuthHook(
    deps.tokenService,
    deps.apiKeyRepo,
    deps.userRepo,
    deps.memberRepo,
    deps.cache,
  );
  const orgAuthHook = createOrganizationAuthHook(deps.memberRepo);

  fastify.post(
    '/api/v1/organizations/:organizationId/api-keys',
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
        body: createAPIKeyRequest,
        tags: ['api-keys'],
        summary: 'Create an API key',
        security: [{ bearerAuth: [] }],
      },
    },
    deps.apiKey.create.bind(deps.apiKey),
  );

  fastify.get(
    '/api/v1/organizations/:organizationId/api-keys',
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
        tags: ['api-keys'],
        summary: 'List API keys',
        security: [{ bearerAuth: [] }],
      },
    },
    deps.apiKey.list.bind(deps.apiKey),
  );

  fastify.delete(
    '/api/v1/organizations/:organizationId/api-keys/:id',
    {
      preHandler: [authHook, orgAuthHook],
      schema: {
        params: {
          type: 'object',
          required: ['organizationId', 'id'],
          properties: {
            organizationId: { type: 'string', format: 'uuid' },
            id: { type: 'string', format: 'uuid' },
          },
        },
        tags: ['api-keys'],
        summary: 'Revoke an API key',
        security: [{ bearerAuth: [] }],
      },
    },
    deps.apiKey.revoke.bind(deps.apiKey),
  );
}
