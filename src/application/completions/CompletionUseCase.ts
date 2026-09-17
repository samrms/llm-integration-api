import type { ModelRepository } from '../../domain/ports/ModelRepository.js'
import type { LLMProvider, LLMMessage } from '../../domain/ports/LLMProvider.js'
import type { LLMRequestRepository } from '../../domain/ports/LLMRequestRepository.js'
import type { CacheService } from '../../domain/ports/CacheService.js'
import type { IdempotencyRepository } from '../../domain/ports/IdempotencyRepository.js'
import type { Config } from '../../config/Config.js'
import {
  NotFoundError,
  ValidationError,
  QuotaExceededError,
} from '../../domain/errors/AppError.js'

export interface CompletionInput {
  organizationId: string
  userId?: string
  requestId: string
  model: string
  messages: LLMMessage[]
  temperature?: number
  maxTokens?: number
  idempotencyKey?: string
}

export interface CompletionOutput {
  id: string
  provider: string
  model: string
  content: string
  finishReason: string | null
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
}

export class CompletionUseCase {
  private readonly providers: Map<string, LLMProvider>
  private readonly maxConcurrent: number

  constructor(
    private readonly modelRepo: ModelRepository,
    providers: LLMProvider[],
    private readonly requestRepo: LLMRequestRepository,
    private readonly cache: CacheService,
    private readonly idempotencyRepo: IdempotencyRepository | null,
    config: Pick<Config, 'MAX_CONCURRENT_LLM_REQUESTS'>,
  ) {
    this.providers = new Map(providers.map((p) => [p.name, p]))
    this.maxConcurrent = config.MAX_CONCURRENT_LLM_REQUESTS
  }

  async execute(input: CompletionInput): Promise<CompletionOutput> {
    // Resolve model
    const modelRecord = await this.modelRepo.findByModel(input.model)
    if (!modelRecord || !modelRecord.enabled) {
      throw new NotFoundError(`Model "${input.model}"`)
    }

    const provider = this.providers.get(modelRecord.provider)
    if (!provider) {
      throw new NotFoundError(`Provider "${modelRecord.provider}"`)
    }

    // Idempotency check
    if (input.idempotencyKey && this.idempotencyRepo) {
      const fingerprint = JSON.stringify({
        model: input.model,
        messages: input.messages,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
      })

      const { record, isDuplicate } = await this.idempotencyRepo.findOrCreate({
        organizationId: input.organizationId,
        key: input.idempotencyKey,
        requestFingerprint: fingerprint,
        expiresAt: new Date(Date.now() + 3600_000),
      })

      if (isDuplicate && record.status === 'completed' && record.responseBody) {
        return JSON.parse(record.responseBody) as CompletionOutput
      }

      if (isDuplicate && record.status === 'pending') {
        throw new ValidationError('Request is still being processed')
      }
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

    try {
      const response = await provider.generate({
        model: input.model,
        messages: input.messages,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
      })

      const durationMs = Date.now() - startTime

      const logPromise = this.requestRepo.create({
        organizationId: input.organizationId,
        userId: input.userId,
        requestId: input.requestId,
        provider: response.provider,
        model: response.model,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        totalTokens: response.usage.totalTokens,
        durationMs,
        status: 'success',
      })

      const completion: CompletionOutput = {
        id: response.id,
        provider: response.provider,
        model: response.model,
        content: response.content,
        finishReason: response.finishReason,
        usage: response.usage,
      }

      // Complete idempotency record
      if (input.idempotencyKey && this.idempotencyRepo) {
        const idempotencyPromise = this.idempotencyRepo.findPendingByKey(
          input.idempotencyKey,
        )
        const [idempotencyRecord] = await Promise.all([
          idempotencyPromise,
          logPromise,
        ])
        if (idempotencyRecord) {
          await this.idempotencyRepo.complete(
            idempotencyRecord.id,
            200,
            JSON.stringify(completion),
          )
        }
      } else {
        await logPromise
      }

      return completion
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
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        durationMs,
        status: 'error',
        errorMessage,
      })

      // Fail idempotency record
      if (input.idempotencyKey && this.idempotencyRepo) {
        const idempotencyRecord = await this.idempotencyRepo.findPendingByKey(
          input.idempotencyKey,
        )
        if (idempotencyRecord) {
          await this.idempotencyRepo.fail(
            idempotencyRecord.id,
            500,
            JSON.stringify({ error: errorMessage }),
          )
        }
      }

      throw error
    } finally {
      await this.cache.decr(concurrencyKey)
    }
  }
}
