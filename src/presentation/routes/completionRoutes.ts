import type { FastifyInstance } from 'fastify';
import "@fastify/swagger";
import { createCompletionController } from '../controllers/completionController.js';
import {
  completionRequest,
  streamingCompletionRequest,
} from '../schemas/completions.js';
import { createAuthHook } from '../hooks/auth.js';
import type { TokenService } from '../../domain/ports/TokenService.js';
import type { APIKeyRepository } from '../../domain/ports/APIKeyRepository.js';
import type { UserRepository } from '../../domain/ports/UserRepository.js';
import type { OrganizationMemberRepository } from '../../domain/ports/OrganizationMemberRepository.js';
import type { CacheService } from '../../domain/ports/CacheService.js';

export interface CompletionRoutesDeps {
  completion: ReturnType<typeof createCompletionController>;
  tokenService: TokenService;
  apiKeyRepo: APIKeyRepository;
  userRepo: UserRepository;
  memberRepo: OrganizationMemberRepository;
  cache: CacheService;
}

export async function completionRoutes(
  fastify: FastifyInstance,
  deps: CompletionRoutesDeps,
): Promise<void> {
  const authHook = createAuthHook(
    deps.tokenService,
    deps.apiKeyRepo,
    deps.userRepo,
    deps.memberRepo,
    deps.cache,
  );

  fastify.post(
    '/api/v1/completions',
    {
      preHandler: [authHook],
      schema: {
        body: completionRequest,
        tags: ['completions'],
        summary: 'Create a chat completion',
        security: [{ bearerAuth: [] }, { apiKeyHeader: [] }],
      },
    },
    deps.completion.complete.bind(deps.completion),
  );

  fastify.post(
    '/api/v1/completions/stream',
    {
      preHandler: [authHook],
      schema: {
        body: streamingCompletionRequest,
        tags: ['completions'],
        summary: 'Stream a chat completion (SSE)',
        security: [{ bearerAuth: [] }, { apiKeyHeader: [] }],
      },
    },
    deps.completion.stream.bind(deps.completion),
  );
}
