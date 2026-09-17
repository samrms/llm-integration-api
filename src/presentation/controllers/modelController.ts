import type { FastifyRequest, FastifyReply } from 'fastify'
import type { ListModelsUseCase } from '../../application/models/ListModelsUseCase.js'

export interface ModelControllerDeps {
  listModelsUseCase: ListModelsUseCase
}

function serializeModel(model: {
  id: string
  provider: string
  model: string
  displayName: string
  enabled: boolean
  contextWindow: number
  supportsStreaming: boolean
  supportsTools: boolean
  supportsVision: boolean
  inputCostPer1k: number
  outputCostPer1k: number
  currency: string
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: model.id,
    provider: model.provider,
    model: model.model,
    displayName: model.displayName,
    enabled: model.enabled,
    contextWindow: model.contextWindow,
    supportsStreaming: model.supportsStreaming,
    supportsTools: model.supportsTools,
    supportsVision: model.supportsVision,
    inputCostPer1k: model.inputCostPer1k,
    outputCostPer1k: model.outputCostPer1k,
    currency: model.currency,
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
  }
}

export function createModelController(deps: ModelControllerDeps) {
  return {
    async list(_request: FastifyRequest, reply: FastifyReply) {
      const models = await deps.listModelsUseCase.execute()
      reply.send(models.map(serializeModel))
    },
  }
}
