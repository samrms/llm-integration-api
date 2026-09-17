import { z } from 'zod'

// ---------------------------------------------------------------------------
// Usage Query Params
// ---------------------------------------------------------------------------
export const usageQueryParams = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  cursor: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Usage Response
// ---------------------------------------------------------------------------
export const usageResponse = z.object({
  data: z.array(
    z.object({
      id: z.string().uuid(),
      organizationId: z.string().uuid().nullable(),
      userId: z.string().uuid().nullable(),
      requestId: z.string(),
      provider: z.string(),
      model: z.string(),
      inputTokens: z.number(),
      outputTokens: z.number(),
      totalTokens: z.number(),
      durationMs: z.number(),
      status: z.enum(['success', 'error']),
      errorMessage: z.string().nullable(),
      conversationId: z.string().uuid().nullable(),
      createdAt: z.string().datetime(),
    }),
  ),
  nextCursor: z.string().nullable(),
  summary: z.object({
    totalRequests: z.number(),
    totalInputTokens: z.number(),
    totalOutputTokens: z.number(),
    totalTokens: z.number(),
    estimatedCost: z.number(),
  }),
})

export type UsageQueryParams = z.infer<typeof usageQueryParams>
export type UsageResponse = z.infer<typeof usageResponse>
