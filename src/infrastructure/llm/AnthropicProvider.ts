import Anthropic from '@anthropic-ai/sdk'
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

export interface AnthropicProviderOptions {
  apiKey?: string
  baseURL?: string
  defaultHeaders?: Record<string, string>
  timeoutMs?: number
  maxRetries?: number
}

export class AnthropicProvider extends LLMProvider {
  readonly name = 'anthropic'
  private readonly client: Anthropic
  private readonly defaultTimeoutMs: number

  constructor(options?: AnthropicProviderOptions) {
    super()
    this.client = new Anthropic({
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
    const { system, messages } = this.toAnthropicMessages(request.messages)
    const controller = this.createAbortController(signal, this.defaultTimeoutMs)

    try {
      const params: Anthropic.MessageCreateParamsNonStreaming = {
        model: request.model,
        messages,
        max_tokens: request.maxTokens ?? 4096,
        stream: false,
      }

      if (system) {
        params.system = system
      }
      if (request.temperature !== undefined) {
        params.temperature = request.temperature
      }

      const response = await this.client.messages.create(params, {
        signal: controller.signal,
      })

      const content = this.extractTextContent(response.content)
      const finishReason = this.mapStopReason(response.stop_reason)

      return {
        id: response.id,
        provider: this.name,
        model: response.model,
        content,
        finishReason,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens:
            response.usage.input_tokens + response.usage.output_tokens,
        },
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
    const { system, messages } = this.toAnthropicMessages(request.messages)
    const controller = this.createAbortController(signal, this.defaultTimeoutMs)

    try {
      const params: Anthropic.MessageCreateParamsStreaming = {
        model: request.model,
        messages,
        max_tokens: request.maxTokens ?? 4096,
        stream: true,
      }

      if (system) {
        params.system = system
      }
      if (request.temperature !== undefined) {
        params.temperature = request.temperature
      }

      const stream = this.client.messages.stream(params, {
        signal: controller.signal,
      })

      let id = ''
      let model = request.model

      for await (const event of stream) {
        if (controller.signal.aborted) {
          break
        }

        if (event.type === 'message_start') {
          id = event.message.id
          model = event.message.model
        }

        if (event.type === 'content_block_delta') {
          const delta = event.delta
          if ('text' in delta) {
            yield {
              id,
              provider: this.name,
              model,
              delta: delta.text,
              finishReason: null,
            }
          }
        }

        if (event.type === 'message_delta') {
          const stopReason = this.mapStopReason(event.delta.stop_reason)
          const usage: LLMUsage | undefined = event.usage
            ? {
                inputTokens: 0,
                outputTokens: event.usage.output_tokens,
                totalTokens: event.usage.output_tokens,
              }
            : undefined

          yield {
            id,
            provider: this.name,
            model,
            delta: '',
            finishReason: stopReason,
            usage,
          }
        }
      }

      // Ensure we always yield a final chunk with full usage
      const finalMessage = await stream.finalMessage()
      if (!controller.signal.aborted) {
        yield {
          id: finalMessage.id,
          provider: this.name,
          model: finalMessage.model,
          delta: '',
          finishReason: this.mapStopReason(finalMessage.stop_reason),
          usage: {
            inputTokens: finalMessage.usage.input_tokens,
            outputTokens: finalMessage.usage.output_tokens,
            totalTokens:
              finalMessage.usage.input_tokens +
              finalMessage.usage.output_tokens,
          },
        }
      }
    } catch (error) {
      throw this.normalizeError(error)
    } finally {
      controller.abort()
    }
  }

  /**
   * Separate system messages from the rest, as Anthropic handles system
   * messages differently from OpenAI.
   */
  private toAnthropicMessages(messages: LLMMessage[]): {
    system: string | undefined
    messages: Anthropic.MessageParam[]
  } {
    let system: string | undefined
    const result: Anthropic.MessageParam[] = []

    for (const msg of messages) {
      if (msg.role === 'system') {
        system = system ? `${system}\n\n${msg.content}` : msg.content
        continue
      }

      result.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })
    }

    return { system, messages: result }
  }

  private extractTextContent(content: Anthropic.ContentBlock[]): string {
    return content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
  }

  private mapStopReason(reason: string | null): string | null {
    if (!reason) return null

    switch (reason) {
      case 'end_turn':
        return 'stop'
      case 'stop_sequence':
        return 'stop'
      case 'max_tokens':
        return 'length'
      case 'tool_use':
        return 'tool_calls'
      default:
        return reason
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
    if (
      error instanceof Error &&
      (error.name === 'AbortError' || error.message.includes('timed out'))
    ) {
      return new LLMTimeoutError(this.name)
    }

    // Anthropic SDK APIError
    if (
      error instanceof Anthropic.APIError ||
      (error && typeof error === 'object' && 'status' in error)
    ) {
      const apiError = error as {
        status?: number
        message?: string
        error?: { message?: string }
      }
      const status = apiError.status
      const message =
        apiError.error?.message ?? apiError.message ?? 'Unknown Anthropic error'

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

    if (error instanceof Error) {
      return new LLMUnavailableError(this.name)
    }

    return new LLMUnavailableError(this.name)
  }
}
