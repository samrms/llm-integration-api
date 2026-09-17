import type { FastifyRequest, FastifyReply } from 'fastify';
import type {
  TokenService,
  TokenPayload,
} from '../../domain/ports/TokenService.js';
import type { APIKeyRepository } from '../../domain/ports/APIKeyRepository.js';
import type { CacheService } from '../../domain/ports/CacheService.js';
import { UserRole } from '../../domain/entities/User.js';
import {
  AuthenticationError,
  AuthorizationError,
} from '../../domain/errors/AppError.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    userEmail?: string;
    organizationId?: string;
    apiKeyScopes?: string[];
  }
}

export function createAuthHook(
  tokenService: TokenService,
  apiKeyRepo: APIKeyRepository,
  _userRepo: unknown,
  _memberRepo: unknown,
  cache: CacheService,
) {
  return async function authPreHandler(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const apiKey = request.headers['x-api-key'] as string | undefined;
    if (apiKey) {
      await handleApiKeyAuth(apiKey, request, reply);
      return;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    await handleJwtAuth(token, request);
  };

  async function handleApiKeyAuth(
    rawKey: string,
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    const prefix = rawKey.substring(0, 16);
    const apiKeyRecord = await apiKeyRepo.findByPrefix(prefix);

    if (!apiKeyRecord || !apiKeyRecord.isActive) {
      throw new AuthenticationError('Invalid API key');
    }

    const { createHash } = await import('node:crypto');
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    if (keyHash !== apiKeyRecord.keyHash) {
      throw new AuthenticationError('Invalid API key');
    }

    apiKeyRepo.updateLastUsed(apiKeyRecord.id).catch(() => {});

    request.organizationId = apiKeyRecord.organizationId;
    request.apiKeyScopes = apiKeyRecord.scopes;
  }

  async function handleJwtAuth(
    token: string,
    request: FastifyRequest,
  ): Promise<void> {
    const isRevoked = await cache.exists(`revoked:${token}`);
    if (isRevoked) {
      throw new AuthenticationError('Token has been revoked');
    }

    const payload: TokenPayload = await tokenService.verifyAccessToken(token);

    request.userId = payload.sub;
    request.userEmail = payload.email;
  }
}

/**
 * Authorization hook for organization-level access.
 * Must be used after auth hook.
 */
export function createOrganizationAuthHook(memberRepo: {
  findByOrganizationAndUser: (
    orgId: string,
    userId: string,
  ) => Promise<{ hasMinimumRole: (role: UserRole) => boolean } | null>;
}) {
  return async function organizationAuthPreHandler(
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    const organizationId =
      (request.params as Record<string, string>)?.organizationId ??
      request.organizationId;

    if (!organizationId) {
      throw new AuthorizationError('Organization ID is required');
    }

    if (request.apiKeyScopes) {
      request.organizationId = organizationId;
      return;
    }

    if (!request.userId) {
      throw new AuthenticationError();
    }

    const membership = await memberRepo.findByOrganizationAndUser(
      organizationId,
      request.userId,
    );

    if (!membership) {
      throw new AuthorizationError('Not a member of this organization');
    }

    request.organizationId = organizationId;
  };
}
