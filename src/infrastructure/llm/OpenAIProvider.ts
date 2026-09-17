import OpenAI from 'openai'
import {
  LLMProvider,
  type LLMGenerateRequest,
  type LLMMessage,
  type LLMResponse,
  type LLMStreamChunk,
  type LLMUsage,
} from '../../domain/ports/LLMProvider.js'
import {
  LLMInvalidRequestError,
  LLMRateLimitError,
  LLMTimeoutError,
  LLMUnavailableError,
} from '../../domain/errors/AppError.js'

export interface OpenAIProviderOptions {
  apiKey?: string
  baseURL?: string
  defaultHeaders?: Record<string, string>
  timeoutMs?: number
  maxRetries?: number
}

export class OpenAIProvider extends LLMProvider {
  readonly name = 'openai'
  private readonly client: OpenAI
  private readonly defaultTimeoutMs: number

  constructor(options?: OpenAIProviderOptions) {
    super()
    this.client = new OpenAI({
      apiKey: options?.apiKey,
      baseURL: options?.baseURL,
      defaultHeaders: options?.defaultHeaders,
      timeout: options?.timeoutMs ?? 60_000,
      maxRetries: options?.maxRetries ?? 2,
    })
    this.defaultTimeoutMs = options?.timeoutMs ?? 60_000
  }

  async generate(
    request: LLMGenerateRequest,
    signal?: AbortSignal,
  ): Promise<LLMResponse> {
    const messages = this.toOpenAIMessages(request.messages)

    const timeoutMs = this.defaultTimeoutMs
    const controller = this.createAbortController(signal, timeoutMs)

    try {
      const response = await this.client.chat.completions.create(
        {
          model: request.model,
          messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          stream: false,
        },
        {
          signal: controller.signal,
        },
      )

      const choice = response.choices[0]
      const content = choice?.message?.content ?? ''
      const finishReason = choice?.finish_reason ?? null

      return {
        id: response.id,
        provider: this.name,
        model: response.model,
        content,
        finishReason,
        usage: this.toUsage(response.usage),
      }
    } catch (error) {
      throw this.normalizeError(error)
    } finally {
      controller.abort()
    }
  }

  async *stream(
    request: LLMGenerateRequest,
    signal?: AbortSignal,
  ): AsyncIterable<LLMStreamChunk> {
    const messages = this.toOpenAIMessages(request.messages)
    const timeoutMs = this.defaultTimeoutMs
    const controller = this.createAbortController(signal, timeoutMs)

    try {
      const stream = await this.client.chat.completions.create(
        {
          model: request.model,
          messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          stream: true,
          stream_options: { include_usage: true },
        },
        {
          signal: controller.signal,
        },
      )

      for await (const chunk of stream) {
        if (controller.signal.aborted) {
          break
        }

        const choice = chunk.choices[0]
        const delta = choice?.delta?.content ?? ''
        const finishReason = choice?.finish_reason ?? null
        const usage = chunk.usage ? this.toUsage(chunk.usage) : undefined

        yield {
          id: chunk.id,
          provider: this.name,
          model: chunk.model,
          delta,
          finishReason,
          usage,
        }
      }
    } catch (error) {
      throw this.normalizeError(error)
    } finally {
      controller.abort()
    }
  }

  private toOpenAIMessages(
    messages: LLMMessage[],
  ): OpenAI.ChatCompletionMessageParam[] {
    return messages.map((m) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }))
  }

  private toUsage(usage: OpenAI.CompletionUsage | undefined | null): LLMUsage {
    if (!usage) {
      return { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
    }
    return {
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
    }
  }

  private createAbortController(
    signal?: AbortSignal,
    timeoutMs?: number,
  ): AbortController {
    const controller = new AbortController()

    if (signal) {
      if (signal.aborted) {
        controller.abort(signal.reason)
      } else {
        signal.addEventListener(
          'abort',
          () => controller.abort(signal.reason),
          { once: true },
        )
      }
    }

    if (timeoutMs && timeoutMs > 0) {
      setTimeout(() => {
        if (!controller.signal.aborted) {
          controller.abort(new Error(`Request timed out after ${timeoutMs}ms`))
        }
      }, timeoutMs)
    }

    return controller
  }

  private normalizeError(error: unknown) {
    // AbortError from signal / timeout
    if (
      error instanceof Error &&
      (error.name === 'AbortError' || error.message.includes('timed out'))
    ) {
      return new LLMTimeoutError(this.name)
    }

    // OpenAI SDK APIError
    if (
      error instanceof OpenAI.APIError ||
      (error && typeof error === 'object' && 'status' in error)
    ) {
      const apiError = error as {
        status?: number
        message?: string
        error?: { message?: string }
      }
      const status = apiError.status
      const message =
        apiError.error?.message ?? apiError.message ?? 'Unknown OpenAI error'

      if (status === 429) {
        return new LLMRateLimitError(this.name)
      }
      if (status === 408 || status === 504) {
        return new LLMTimeoutError(this.name)
      }
      if (status === 502 || status === 503) {
        return new LLMUnavailableError(this.name)
      }
      if (status === 400) {
        return new LLMInvalidRequestError(this.name, message)
      }

      return new LLMUnavailableError(this.name)
    }

    // Generic Error
    if (error instanceof Error) {
      return new LLMUnavailableError(this.name)
    }

    return new LLMUnavailableError(this.name)
  }
}
