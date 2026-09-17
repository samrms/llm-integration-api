import type { FastifyInstance } from 'fastify'
import "@fastify/swagger";
import { createConversationController } from '../controllers/conversationController.js'
import {
  createConversationRequest,
  sendMessageRequest,
} from '../schemas/conversations.js'
import { createAuthHook } from '../hooks/auth.js'
import { createOrganizationAuthHook } from '../hooks/auth.js'
import type { TokenService } from '../../domain/ports/TokenService.js'
import type { APIKeyRepository } from '../../domain/ports/APIKeyRepository.js'
import type { UserRepository } from '../../domain/ports/UserRepository.js'
import type { OrganizationMemberRepository } from '../../domain/ports/OrganizationMemberRepository.js'
import type { CacheService } from '../../domain/ports/CacheService.js'

export interface ConversationRoutesDeps {
  conversation: ReturnType<typeof createConversationController>
  tokenService: TokenService
  apiKeyRepo: APIKeyRepository
  userRepo: UserRepository
  memberRepo: OrganizationMemberRepository
  cache: CacheService
}

export async function conversationRoutes(
  fastify: FastifyInstance,
  deps: ConversationRoutesDeps,
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
    '/api/v1/organizations/:organizationId/conversations',
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
        body: createConversationRequest,
        tags: ['conversations'],
        summary: 'Create a conversation',
        security: [{ bearerAuth: [] }],
      },
    },
    deps.conversation.create.bind(deps.conversation),
  )

  fastify.get(
    '/api/v1/organizations/:organizationId/conversations',
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
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            cursor: { type: 'string' },
          },
        },
        tags: ['conversations'],
        summary: 'List conversations',
        security: [{ bearerAuth: [] }],
      },
    },
    deps.conversation.list.bind(deps.conversation),
  )

  fastify.get(
    '/api/v1/organizations/:organizationId/conversations/:id',
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
        tags: ['conversations'],
        summary: 'Get a conversation',
        security: [{ bearerAuth: [] }],
      },
    },
    deps.conversation.get.bind(deps.conversation),
  )

  fastify.delete(
    '/api/v1/organizations/:organizationId/conversations/:id',
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
        tags: ['conversations'],
        summary: 'Delete a conversation',
        security: [{ bearerAuth: [] }],
      },
    },
    deps.conversation.delete.bind(deps.conversation),
  )

  fastify.get(
    '/api/v1/organizations/:organizationId/conversations/:id/messages',
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
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            cursor: { type: 'string' },
          },
        },
        tags: ['conversations'],
        summary: 'List messages in a conversation',
        security: [{ bearerAuth: [] }],
      },
    },
    deps.conversation.listMessages.bind(deps.conversation),
  )

  fastify.post(
    '/api/v1/organizations/:organizationId/conversations/:id/messages',
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
        body: sendMessageRequest,
        tags: ['conversations'],
        summary: 'Send a message in a conversation',
        security: [{ bearerAuth: [] }],
      },
    },
    deps.conversation.sendMessage.bind(deps.conversation),
  )
}
