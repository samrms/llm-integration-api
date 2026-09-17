import type { FastifyInstance } from 'fastify'
import type { Container } from './Container.js'
import { authRoutes } from '../presentation/routes/authRoutes.js'
import { organizationRoutes } from '../presentation/routes/organizationRoutes.js'
import { apiKeyRoutes } from '../presentation/routes/apiKeyRoutes.js'
import { modelRoutes } from '../presentation/routes/modelRoutes.js'
import { completionRoutes } from '../presentation/routes/completionRoutes.js'
import { conversationRoutes } from '../presentation/routes/conversationRoutes.js'
import { usageRoutes } from '../presentation/routes/usageRoutes.js'
import { healthRoutes } from '../presentation/routes/healthRoutes.js'

export async function registerRoutes(
  fastify: FastifyInstance,
  container: Container,
): Promise<void> {
  // Health routes (no auth)
  await healthRoutes(fastify, {
    db: container.db,
    redis: container.redis,
  })

  // Auth routes
  await authRoutes(fastify, {
    auth: container.authController,
    tokenService: container.tokenService,
    apiKeyRepo: container.apiKeyRepo,
    userRepo: container.userRepo,
    memberRepo: container.memberRepo,
    cache: container.cache,
  })

  // Organization routes
  await organizationRoutes(fastify, {
    org: container.organizationController,
    tokenService: container.tokenService,
    apiKeyRepo: container.apiKeyRepo,
    userRepo: container.userRepo,
    memberRepo: container.memberRepo,
    cache: container.cache,
  })

  // API Key routes
  await apiKeyRoutes(fastify, {
    apiKey: container.apiKeyController,
    tokenService: container.tokenService,
    apiKeyRepo: container.apiKeyRepo,
    userRepo: container.userRepo,
    memberRepo: container.memberRepo,
    cache: container.cache,
  })

  // Model routes
  await modelRoutes(fastify, {
    model: container.modelController,
    tokenService: container.tokenService,
    apiKeyRepo: container.apiKeyRepo,
    userRepo: container.userRepo,
    memberRepo: container.memberRepo,
    cache: container.cache,
  })

  // Completion routes
  await completionRoutes(fastify, {
    completion: container.completionController,
    tokenService: container.tokenService,
    apiKeyRepo: container.apiKeyRepo,
    userRepo: container.userRepo,
    memberRepo: container.memberRepo,
    cache: container.cache,
  })

  // Conversation routes
  await conversationRoutes(fastify, {
    conversation: container.conversationController,
    tokenService: container.tokenService,
    apiKeyRepo: container.apiKeyRepo,
    userRepo: container.userRepo,
    memberRepo: container.memberRepo,
    cache: container.cache,
  })

  // Usage routes
  await usageRoutes(fastify, {
    usage: container.usageController,
    tokenService: container.tokenService,
    apiKeyRepo: container.apiKeyRepo,
    userRepo: container.userRepo,
    memberRepo: container.memberRepo,
    cache: container.cache,
  })
}
