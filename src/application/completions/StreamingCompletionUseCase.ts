import type { ModelRepository } from '../../domain/ports/ModelRepository.js'
import type {
  LLMProvider,
  LLMMessage,
  LLMStreamChunk,
} from '../../domain/ports/LLMProvider.js'
import type { LLMRequestRepository } from '../../domain/ports/LLMRequestRepository.js'
import type { CacheService } from '../../domain/ports/CacheService.js'
import type { Config } from '../../config/Config.js'
import {
  NotFoundError,
  QuotaExceededError,
} from '../../domain/errors/AppError.js'

export interface StreamingCompletionInput {
  organizationId: string
  userId?: string
  requestId: string
  model: string
  messages: LLMMessage[]
  temperature?: number
  maxTokens?: number
}

export class StreamingCompletionUseCase {
  private readonly providers: Map<string, LLMProvider>
  private readonly maxConcurrent: number

  constructor(
    private readonly modelRepo: ModelRepository,
    providers: LLMProvider[],
    private readonly requestRepo: LLMRequestRepository,
    private readonly cache: CacheService,
    config: Pick<Config, 'MAX_CONCURRENT_LLM_REQUESTS'>,
  ) {
    this.providers = new Map(providers.map((p) => [p.name, p]))
    this.maxConcurrent = config.MAX_CONCURRENT_LLM_REQUESTS
  }

  async *executeStream(
    input: StreamingCompletionInput,
  ): AsyncGenerator<LLMStreamChunk> {
    // Resolve model
    const modelRecord = await this.modelRepo.findByModel(input.model)
    if (!modelRecord || !modelRecord.enabled) {
      throw new NotFoundError(`Model "${input.model}"`)
    }

    const provider = this.providers.get(modelRecord.provider)
    if (!provider) {
      throw new NotFoundError(`Provider "${modelRecord.provider}"`)
    }

    // Concurrency tracking via Redis
    const concurrencyKey = `concurrency:${input.organizationId}`
    const current = await this.cache.incrWithTTL(concurrencyKey, 60)
    if (current > this.maxConcurrent) {
      await this.cache.decr(concurrencyKey)
      throw new QuotaExceededError(
        'Too many concurrent requests. Please try again later.',
      )
    }

    const startTime = Date.now()
    let totalUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }

    try {
      const stream = provider.stream({
        model: input.model,
        messages: input.messages,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
      })

      for await (const chunk of stream) {
        if (chunk.usage) {
          totalUsage = chunk.usage
        }
        yield chunk
      }

      const durationMs = Date.now() - startTime

      await this.requestRepo.create({
        organizationId: input.organizationId,
        userId: input.userId,
        requestId: input.requestId,
        provider: modelRecord.provider,
        model: input.model,
        inputTokens: totalUsage.inputTokens,
        outputTokens: totalUsage.outputTokens,
        totalTokens: totalUsage.totalTokens,
        durationMs,
        status: 'success',
      })
    } catch (error) {
      const durationMs = Date.now() - startTime
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'

      await this.requestRepo.create({
        organizationId: input.organizationId,
        userId: input.userId,
        requestId: input.requestId,
        provider: modelRecord.provider,
        model: input.model,
        inputTokens: totalUsage.inputTokens,
        outputTokens: totalUsage.outputTokens,
        totalTokens: totalUsage.totalTokens,
        durationMs,
        status: 'error',
        errorMessage,
      })

      throw error
    } finally {
      await this.cache.decr(concurrencyKey)
    }
  }
}
