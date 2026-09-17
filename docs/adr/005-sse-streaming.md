# ADR 005: SSE for Streaming

## Context

LLM completions can take seconds to complete. Users need real-time feedback as tokens are generated. The API needs a streaming endpoint.

## Decision

Use **Server-Sent Events (SSE)** for streaming LLM completions. The endpoint `POST /api/v1/completions/stream` returns a `text/event-stream` response.

Each event is a JSON-encoded `LLMStreamChunk`:

```
data: {"id":"...","provider":"openai","model":"gpt-4","delta":"Hello","finishReason":null}

data: {"id":"...","provider":"openai","model":"gpt-4","delta":" world","finishReason":null}

data: {"id":"...","provider":"openai","model":"gpt-4","delta":"","finishReason":"stop"}
```

The `StreamingCompletionUseCase` wraps the provider's `AsyncIterable<LLMStreamChunk>` and forwards chunks to the response stream.

## Alternatives

- **WebSocket:** Bidirectional, but LLM streaming is unidirectional (server → client). Adds complexity for sessions, reconnection, and load balancing.
- **Chunked HTTP:** Manual chunked transfer encoding. SSE is simpler and has built-in browser support (`EventSource`).
- **gRPC streaming:** Requires protobuf definitions and gRPC client. Overkill for a REST API.

## Consequences

- **Pro:** Simple to implement — Fastify supports streaming responses.
- **Pro:** Browser-native `EventSource` API for frontend clients.
- **Pro:** Automatic reconnection built into `EventSource`.
- **Pro:** Works through most proxies and load balancers (unlike WebSockets).
- **Con:** One-directional only (server → client). If client needs to send data during streaming, a different approach is needed.
- **Con:** No built-in acknowledgment mechanism — the client can't confirm receipt of specific chunks.
