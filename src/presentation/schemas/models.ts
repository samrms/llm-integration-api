import { z } from 'zod'

// ---------------------------------------------------------------------------
// List Models
// ---------------------------------------------------------------------------
export const listModelsResponse = z.array(
  z.object({
    id: z.string().uuid(),
    provider: z.string(),
    model: z.string(),
    displayName: z.string(),
    enabled: z.boolean(),
    contextWindow: z.number(),
    supportsStreaming: z.boolean(),
    supportsTools: z.boolean(),
    supportsVision: z.boolean(),
    inputCostPer1k: z.number(),
    outputCostPer1k: z.number(),
    currency: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
)

export type ListModelsResponse = z.infer<typeof listModelsResponse>
