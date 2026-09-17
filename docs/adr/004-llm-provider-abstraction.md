# ADR 004: LLM Provider Abstraction

## Context

The gateway must support multiple LLM providers (OpenAI, Anthropic) with a unified API. Providers have different SDKs, response formats, and capabilities.

## Decision

Define an abstract `LLMProvider` class in the domain layer:

```typescript
export abstract class LLMProvider {
  abstract readonly name: string;
  abstract generate(
    request: LLMGenerateRequest,
    signal?: AbortSignal,
  ): Promise<LLMResponse>;
  abstract stream(
    request: LLMGenerateRequest,
    signal?: AbortSignal,
  ): AsyncIterable<LLMStreamChunk>;
}
```

Concrete implementations:

- `OpenAIProvider` — Wraps the `openai` SDK.
- `AnthropicProvider` — Wraps the `@anthropic-ai/sdk` SDK.
- `MockLLMProvider` — For testing.

Providers are conditionally instantiated based on environment variables (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`).

The `CompletionUseCase` and `StreamingCompletionUseCase` hold a `Map<string, LLMProvider>` and select the provider based on the model's `provider` field.

## Alternatives

- **Direct SDK calls in use cases:** Tight coupling to specific providers. Adding a new provider requires modifying business logic.
- **Adapter pattern with separate interfaces:** More formal than necessary — the providers share the same `generate`/`stream` contract.
- **GraphQL federation:** Overkill for this use case.

## Consequences

- **Pro:** Adding a new provider (e.g., Google Gemini) requires only implementing `LLMProvider` — no changes to use cases or controllers.
- **Pro:** Provider selection is driven by the `models` table, allowing runtime configuration.
- **Pro:** Mock provider enables fast, deterministic testing.
- **Con:** All providers must conform to the same `LLMGenerateRequest`/`LLMResponse` contract. Provider-specific features (e.g., OpenAI function calling) require extending the shared interface.
