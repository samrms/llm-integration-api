import type { FastifyInstance } from 'fastify';
import "@fastify/swagger";
import { createAuthController } from '../controllers/authController.js';
import {
  signupRequest,
  signinRequest,
  refreshRequest,
  logoutRequest,
} from '../schemas/auth.js';
import { createAuthHook } from '../hooks/auth.js';
import type { TokenService } from '../../domain/ports/TokenService.js';
import type { APIKeyRepository } from '../../domain/ports/APIKeyRepository.js';
import type { UserRepository } from '../../domain/ports/UserRepository.js';
import type { OrganizationMemberRepository } from '../../domain/ports/OrganizationMemberRepository.js';
import type { CacheService } from '../../domain/ports/CacheService.js';

export interface AuthRoutesDeps {
  auth: ReturnType<typeof createAuthController>;
  tokenService: TokenService;
  apiKeyRepo: APIKeyRepository;
  userRepo: UserRepository;
  memberRepo: OrganizationMemberRepository;
  cache: CacheService;
}

export async function authRoutes(
  fastify: FastifyInstance,
  deps: AuthRoutesDeps,
): Promise<void> {
  const authHook = createAuthHook(
    deps.tokenService,
    deps.apiKeyRepo,
    deps.userRepo,
    deps.memberRepo,
    deps.cache,
  );

  fastify.post(
    '/api/v1/auth/signup',
    {
      schema: {
        body: signupRequest,
        tags: ['auth'],
        summary: 'Create a new account',
      },
    },
    deps.auth.signup.bind(deps.auth),
  );

  fastify.post(
    '/api/v1/auth/signin',
    {
      schema: {
        body: signinRequest,
        tags: ['auth'],
        summary: 'Sign in with email and password',
      },
    },
    deps.auth.signin.bind(deps.auth),
  );

  fastify.post(
    '/api/v1/auth/refresh',
    {
      schema: {
        body: refreshRequest,
        tags: ['auth'],
        summary: 'Refresh access token',
      },
    },
    deps.auth.refresh.bind(deps.auth),
  );

  fastify.post(
    '/api/v1/auth/logout',
    {
      preHandler: [authHook],
      schema: {
        body: logoutRequest,
        tags: ['auth'],
        summary: 'Sign out',
        security: [{ bearerAuth: [] }],
      },
    },
    deps.auth.logout.bind(deps.auth),
  );

  fastify.get(
    '/api/v1/users/me',
    {
      preHandler: [authHook],
      schema: {
        tags: ['auth'],
        summary: 'Get current user profile',
        security: [{ bearerAuth: [] }],
      },
    },
    deps.auth.me.bind(deps.auth),
  );
}
