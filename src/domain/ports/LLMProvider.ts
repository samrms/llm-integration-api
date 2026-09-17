export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMGenerateRequest {
  model: string
  messages: LLMMessage[]
  temperature?: number
  maxTokens?: number
}

export interface LLMUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export interface LLMResponse {
  id: string
  provider: string
  model: string
  content: string
  finishReason: string | null
  usage: LLMUsage
}

export interface LLMStreamChunk {
  id: string
  provider: string
  model: string
  delta: string
  finishReason: string | null
  usage?: LLMUsage
}

export abstract class LLMProvider {
  abstract readonly name: string

  abstract generate(
    request: LLMGenerateRequest,
    signal?: AbortSignal,
  ): Promise<LLMResponse>

  abstract stream(
    request: LLMGenerateRequest,
    signal?: AbortSignal,
  ): AsyncIterable<LLMStreamChunk>
}
