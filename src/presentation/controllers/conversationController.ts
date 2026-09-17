import type { FastifyRequest, FastifyReply } from 'fastify'
import type { CreateConversationUseCase } from '../../application/conversations/CreateConversationUseCase.js'
import type { ListConversationsUseCase } from '../../application/conversations/ListConversationsUseCase.js'
import type { GetConversationUseCase } from '../../application/conversations/GetConversationUseCase.js'
import type { DeleteConversationUseCase } from '../../application/conversations/DeleteConversationUseCase.js'
import type { ListMessagesUseCase } from '../../application/conversations/ListMessagesUseCase.js'
import type { SendMessageUseCase } from '../../application/conversations/SendMessageUseCase.js'

export interface ConversationControllerDeps {
  createConversationUseCase: CreateConversationUseCase
  listConversationsUseCase: ListConversationsUseCase
  getConversationUseCase: GetConversationUseCase
  deleteConversationUseCase: DeleteConversationUseCase
  listMessagesUseCase: ListMessagesUseCase
  sendMessageUseCase: SendMessageUseCase
}

function serializeConversation(conv: {
  id: string
  organizationId: string
  userId: string
  title: string | null
  model: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: conv.id,
    organizationId: conv.organizationId,
    userId: conv.userId,
    title: conv.title,
    model: conv.model,
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
  }
}

function serializeMessage(msg: {
  id: string
  conversationId: string
  organizationId: string
  role: string
  content: string
  tokenCount: number | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: msg.id,
    conversationId: msg.conversationId,
    organizationId: msg.organizationId,
    role: msg.role,
    content: msg.content,
    tokenCount: msg.tokenCount,
    createdAt: msg.createdAt.toISOString(),
    updatedAt: msg.updatedAt.toISOString(),
  }
}

export function createConversationController(deps: ConversationControllerDeps) {
  return {
    async create(request: FastifyRequest, reply: FastifyReply) {
      const body = request.body as { title?: string; model?: string }

      const conversation = await deps.createConversationUseCase.execute({
        organizationId: request.organizationId!,
        userId: request.userId!,
        title: body.title,
        model: body.model,
      })

      reply.code(201).send(serializeConversation(conversation))
    },

    async list(request: FastifyRequest, reply: FastifyReply) {
      const query = request.query as { limit?: number; cursor?: string }

      const result = await deps.listConversationsUseCase.execute({
        organizationId: request.organizationId!,
        limit: query.limit ?? 20,
        cursor: query.cursor,
      })

      reply.send({
        data: result.data.map(serializeConversation),
        nextCursor: result.nextCursor,
      })
    },

    async get(request: FastifyRequest, reply: FastifyReply) {
      const params = request.params as { id: string }

      const conversation = await deps.getConversationUseCase.execute(
        request.organizationId!,
        params.id,
      )

      reply.send(serializeConversation(conversation))
    },

    async delete(request: FastifyRequest, reply: FastifyReply) {
      const params = request.params as { id: string }

      await deps.deleteConversationUseCase.execute({
        organizationId: request.organizationId!,
        conversationId: params.id,
      })

      reply.code(204).send()
    },

    async listMessages(request: FastifyRequest, reply: FastifyReply) {
      const params = request.params as { id: string }
      const query = request.query as { limit?: number; cursor?: string }

      const result = await deps.listMessagesUseCase.execute({
        organizationId: request.organizationId!,
        conversationId: params.id,
        limit: query.limit ?? 20,
        cursor: query.cursor,
      })

      reply.send({
        data: result.data.map(serializeMessage),
        nextCursor: result.nextCursor,
      })
    },

    async sendMessage(request: FastifyRequest, reply: FastifyReply) {
      const params = request.params as { id: string }
      const body = request.body as { content: string; model?: string }

      const result = await deps.sendMessageUseCase.execute({
        organizationId: request.organizationId!,
        conversationId: params.id,
        userId: request.userId!,
        content: body.content,
        model: body.model,
      })

      reply.send({
        userMessage: serializeMessage(result.userMessage),
        assistantMessage: serializeMessage(result.assistantMessage),
        usage: result.usage,
      })
    },
  }
}
