import { z } from 'zod'

// ---------------------------------------------------------------------------
// Create Conversation
// ---------------------------------------------------------------------------
export const createConversationRequest = z.object({
  title: z.string().max(500).optional(),
  model: z.string().optional(),
})

export const createConversationResponse = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().nullable(),
  model: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// ---------------------------------------------------------------------------
// List Conversations
// ---------------------------------------------------------------------------
export const listConversationsResponse = z.object({
  data: z.array(
    z.object({
      id: z.string().uuid(),
      organizationId: z.string().uuid(),
      userId: z.string().uuid(),
      title: z.string().nullable(),
      model: z.string().nullable(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    }),
  ),
  nextCursor: z.string().nullable(),
})

// ---------------------------------------------------------------------------
// Conversation (single)
// ---------------------------------------------------------------------------
export const conversationResponse = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().nullable(),
  model: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------
export const messageResponse = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  organizationId: z.string().uuid(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  tokenCount: z.number().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// ---------------------------------------------------------------------------
// List Messages
// ---------------------------------------------------------------------------
export const listMessagesResponse = z.object({
  data: z.array(messageResponse),
  nextCursor: z.string().nullable(),
})

// ---------------------------------------------------------------------------
// Send Message
// ---------------------------------------------------------------------------
export const sendMessageRequest = z.object({
  content: z.string().min(1),
  model: z.string().optional(),
})

export const sendMessageResponse = z.object({
  userMessage: messageResponse,
  assistantMessage: messageResponse,
  usage: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    totalTokens: z.number(),
  }),
})

export type CreateConversationRequest = z.infer<
  typeof createConversationRequest
>
export type CreateConversationResponse = z.infer<
  typeof createConversationResponse
>
export type SendMessageRequest = z.infer<typeof sendMessageRequest>
export type SendMessageResponse = z.infer<typeof sendMessageResponse>
