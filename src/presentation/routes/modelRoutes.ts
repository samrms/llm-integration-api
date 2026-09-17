import type { FastifyInstance } from 'fastify';
import "@fastify/swagger";
import { createModelController } from '../controllers/modelController.js';
import { createAuthHook } from '../hooks/auth.js';
import type { TokenService } from '../../domain/ports/TokenService.js';
import type { APIKeyRepository } from '../../domain/ports/APIKeyRepository.js';
import type { UserRepository } from '../../domain/ports/UserRepository.js';
import type { OrganizationMemberRepository } from '../../domain/ports/OrganizationMemberRepository.js';
import type { CacheService } from '../../domain/ports/CacheService.js';

export interface ModelRoutesDeps {
  model: ReturnType<typeof createModelController>;
  tokenService: TokenService;
  apiKeyRepo: APIKeyRepository;
  userRepo: UserRepository;
  memberRepo: OrganizationMemberRepository;
  cache: CacheService;
}

export async function modelRoutes(
  fastify: FastifyInstance,
  deps: ModelRoutesDeps,
): Promise<void> {
  const authHook = createAuthHook(
    deps.tokenService,
    deps.apiKeyRepo,
    deps.userRepo,
    deps.memberRepo,
    deps.cache,
  );

  fastify.get(
    '/api/v1/models',
    {
      preHandler: [authHook],
      schema: {
        tags: ['models'],
        summary: 'List available models',
        security: [{ bearerAuth: [] }],
      },
    },
    deps.model.list.bind(deps.model),
  );
}
