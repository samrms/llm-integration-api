import { z } from 'zod'

// ---------------------------------------------------------------------------
// Completion Request / Response
// ---------------------------------------------------------------------------
export const completionRequest = z.object({
  model: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string(),
      }),
    )
    .min(1),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  idempotencyKey: z.string().optional(),
})

export const completionResponse = z.object({
  id: z.string(),
  provider: z.string(),
  model: z.string(),
  content: z.string(),
  finishReason: z.string().nullable(),
  usage: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    totalTokens: z.number(),
  }),
})

// ---------------------------------------------------------------------------
// Streaming Completion Request
// ---------------------------------------------------------------------------
export const streamingCompletionRequest = z.object({
  model: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string(),
      }),
    )
    .min(1),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
})

export type CompletionRequest = z.infer<typeof completionRequest>
export type CompletionResponse = z.infer<typeof completionResponse>
export type StreamingCompletionRequest = z.infer<
  typeof streamingCompletionRequest
>
