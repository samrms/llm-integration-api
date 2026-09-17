import { randomUUID } from 'node:crypto'
import {
  LLMProvider,
  type LLMGenerateRequest,
  type LLMResponse,
  type LLMStreamChunk,
} from '../../domain/ports/LLMProvider.js'

export interface MockConfig {
  /** Delay in ms before returning a response. @default 100 */
  delayMs?: number
  /** If set, the mock will throw this error instead of returning a response. */
  error?: Error
  /** Prefix for generated response IDs. @default 'mock' */
  idPrefix?: string
  /** Custom response content. @default 'Mock response' */
  responseContent?: string
  /** Custom finish reason. @default 'stop' */
  finishReason?: string
  /** Custom input token count. @default computed from messages */
  inputTokens?: number
  /** Custom output token count. @default 50 */
  outputTokens?: number
  /** Enable streaming mode for generate(). @default false */
  streamOnGenerate?: boolean
  /** Number of chunks to emit in streaming mode. @default 5 */
  streamChunks?: number
  /** Content for each stream chunk. Defaults to splitting responseContent. */
  streamChunkContent?: string[]
}

export class MockLLMProvider extends LLMProvider {
  readonly name = 'mock'

  private config: MockConfig

  constructor(config?: MockConfig) {
    super()
    this.config = {
      delayMs: 100,
      idPrefix: 'mock',
      responseContent: 'Mock response',
      finishReason: 'stop',
      inputTokens: 10,
      outputTokens: 50,
      streamChunks: 5,
      ...config,
    }
  }

  updateConfig(config: Partial<MockConfig>): void {
    this.config = { ...this.config, ...config }
  }

  async generate(
    request: LLMGenerateRequest,
    signal?: AbortSignal,
  ): Promise<LLMResponse> {
    if (this.config.error) {
      throw this.config.error
    }

    await this.delay(signal)
    this.throwIfAborted(signal)

    const id = `${this.config.idPrefix}-${randomUUID()}`

    const inputTokens =
      this.config.inputTokens ??
      request.messages.reduce(
        (acc, m) => acc + Math.ceil(m.content.length / 4),
        0,
      )

    return {
      id,
      provider: this.name,
      model: request.model,
      content: this.config.responseContent!,
      finishReason: this.config.finishReason ?? null,
      usage: {
        inputTokens,
        outputTokens: this.config.outputTokens!,
        totalTokens: inputTokens + this.config.outputTokens!,
      },
    }
  }

  async *stream(
    request: LLMGenerateRequest,
    signal?: AbortSignal,
  ): AsyncIterable<LLMStreamChunk> {
    if (this.config.error) {
      throw this.config.error
    }

    const id = `${this.config.idPrefix}-${randomUUID()}`
    const numChunks = this.config.streamChunks ?? 5
    const content = this.config.responseContent ?? 'Mock response'
    const chunkContents = this.config.streamChunkContent

    const inputTokens =
      this.config.inputTokens ??
      request.messages.reduce(
        (acc, m) => acc + Math.ceil(m.content.length / 4),
        0,
      )

    for (let i = 0; i < numChunks; i++) {
      await this.delay(signal)
      this.throwIfAborted(signal)

      const isLast = i === numChunks - 1
      const delta = chunkContents?.[i] ?? content

      yield {
        id,
        provider: this.name,
        model: request.model,
        delta: isLast ? delta : `${delta} `,
        finishReason: isLast ? (this.config.finishReason ?? 'stop') : null,
        usage: isLast
          ? {
              inputTokens,
              outputTokens: this.config.outputTokens!,
              totalTokens: inputTokens + this.config.outputTokens!,
            }
          : undefined,
      }
    }
  }

  private async delay(signal?: AbortSignal): Promise<void> {
    const ms = this.config.delayMs ?? 0
    if (ms <= 0) return

    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms)

      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer)
          reject(
            signal.reason instanceof Error
              ? signal.reason
              : new Error('Aborted'),
          )
        },
        { once: true },
      )
    })
  }

  private throwIfAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
      throw signal.reason instanceof Error
        ? signal.reason
        : new Error('Aborted')
    }
  }
}
