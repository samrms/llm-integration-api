# ADR 001: Architecture Overview

## Context

We need to build a multi-tenant LLM gateway REST API that routes requests to multiple LLM providers (OpenAI, Anthropic), manages organizations, API keys, and tracks usage. The system must be maintainable, testable, and ready for production.

## Decision

Adopt a **Clean Architecture** (Ports and Adapters) with four layers:

1. **Domain** — Entities, ports (interfaces), and error types. Zero external dependencies.
2. **Application** — Use cases that orchestrate domain logic via ports.
3. **Infrastructure** — Concrete implementations of ports (Drizzle repositories, JWT auth, LLM providers).
4. **Presentation** — Fastify routes, controllers, Zod schemas, and hooks.

Dependencies flow inward: Presentation → Application → Domain ← Infrastructure.

## Alternatives

- **Layered architecture (traditional):** Simpler but blurs boundaries between business logic and infrastructure.
- **Onion architecture:** Similar to Clean Architecture but more rigid about concentric circles. Overkill for this scale.
- **Flat modules:** No layering — everything in one namespace. Fast to start, painful to maintain.

## Consequences

- Clear separation of concerns makes testing straightforward (mock ports for unit tests, use real implementations for integration tests).
- Adding a new LLM provider requires only implementing the `LLMProvider` abstract class.
- The manual DI container provides full visibility into the dependency graph.
- Slightly more boilerplate than a flat structure, but the payoff in maintainability is significant.
