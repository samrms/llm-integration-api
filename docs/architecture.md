# Architecture Overview

## Layered Architecture

The application follows **Clean Architecture** (also known as Ports and Adapters / Hexagonal Architecture) with four distinct layers:

```
┌─────────────────────────────────────────────────┐
│              Presentation Layer                  │
│  (Routes, Controllers, Schemas, Hooks)           │
├─────────────────────────────────────────────────┤
│              Application Layer                   │
│  (Use Cases — business workflows)                │
├─────────────────────────────────────────────────┤
│              Domain Layer                        │
│  (Entities, Ports, Errors)                       │
├─────────────────────────────────────────────────┤
│              Infrastructure Layer                │
│  (Repositories, Auth, LLM Providers, DB, Redis)  │
└─────────────────────────────────────────────────┘
```

**Dependencies flow inward.** The domain layer has zero external dependencies. The application layer depends only on domain ports. Infrastructure implements domain ports. Presentation depends on application use cases and passes infrastructure implementations through the container.

## Domain Layer

**Location:** `src/domain/`

The domain layer contains the core business rules, independent of any framework or external system.

### Entities (`domain/entities/`)

Rich domain models with encapsulated business logic:

- **User** — Email (lowercased), password hash, name. Factory methods: `create()`, `reconstitute()`.
- **Organization** — Name, owner reference.
- **OrganizationMember** — Links users to organizations with a `UserRole` (OWNER > ADMIN > MEMBER). The `hasMinimumRole()` method implements the role hierarchy.
- **APIKey** — Organization-scoped key with prefix, hash, scopes, expiry, and revocation tracking.
- **Model** — LLM model metadata: provider, context window, capabilities, pricing.
- **Conversation** — Organization-scoped conversation with optional title and model.
- **Message** — Conversation message with role, content, and optional token count.
- **BaseEntity** — UUID primary key, createdAt, updatedAt timestamps.

### Ports (`domain/ports/`)

Interfaces that define how the application interacts with external systems:

- **Repository ports:** `UserRepository`, `OrganizationRepository`, `OrganizationMemberRepository`, `RefreshTokenRepository`, `APIKeyRepository`, `ModelRepository`, `ConversationRepository`, `MessageRepository`, `LLMRequestRepository`, `IdempotencyRepository`, `AuditLogRepository`
- **Service ports:** `TokenService`, `PasswordHasher`, `CacheService`
- **Provider port:** `LLMProvider` (abstract class with `generate()` and `stream()`)

### Errors (`domain/errors/`)

A typed error hierarchy rooted at `AppError`:

```
AppError (abstract)
├── ValidationError (400)
├── AuthenticationError (401)
├── AuthorizationError (403)
├── NotFoundError (404)
├── ConflictError (409)
├── RateLimitError (429)
├── QuotaExceededError (429)
└── LLMError (abstract)
    ├── LLMTimeoutError (504)
    ├── LLMRateLimitError (429)
    ├── LLMUnavailableError (502)
    └── LLMInvalidRequestError (400)
```

Every error carries an HTTP status code and a machine-readable `code` string. The `toJSON()` method produces a consistent error response shape.

## Application Layer

**Location:** `src/application/`

Use cases orchestrate domain entities and ports to fulfill business workflows. Each use case is a single class with an `execute()` method.

| Domain        | Use Cases                                                                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth          | `SignupUseCase`, `SigninUseCase`, `RefreshTokenUseCase`, `LogoutUseCase`, `GetUserProfileUseCase`                                                           |
| Organizations | `CreateOrganizationUseCase`, `ListOrganizationsUseCase`, `AddMemberUseCase`, `RemoveMemberUseCase`                                                          |
| API Keys      | `CreateAPIKeyUseCase`, `ListAPIKeysUseCase`, `RevokeAPIKeyUseCase`                                                                                          |
| Models        | `ListModelsUseCase`                                                                                                                                         |
| Completions   | `CompletionUseCase`, `StreamingCompletionUseCase`                                                                                                           |
| Conversations | `CreateConversationUseCase`, `ListConversationsUseCase`, `GetConversationUseCase`, `DeleteConversationUseCase`, `ListMessagesUseCase`, `SendMessageUseCase` |
| Usage         | `GetUsageUseCase`                                                                                                                                           |

Use cases depend only on domain ports (interfaces), never on concrete implementations.

## Infrastructure Layer

**Location:** `src/infrastructure/`

Implements domain ports using external libraries and databases.

- **`auth/`** — `JWTTokenService` (jose), `Argon2PasswordHasher` (argon2)
- **`database/`** — `PostgreSQLConnection` (pg Pool + Drizzle ORM), schema definitions, migrations
- **`redis/`** — `RedisConnection` (ioredis), `RedisCacheService` implementing `CacheService`
- **`llm/`** — `OpenAIProvider`, `AnthropicProvider` implementing `LLMProvider`; `MockLLMProvider` for testing
- **`repositories/`** — 10 Drizzle-based repository implementations

## Presentation Layer

**Location:** `src/presentation/`

Handles HTTP concerns: routing, request/response mapping, validation, error handling.

### Routes (`routes/`)

Each route module registers endpoints on a Fastify instance, attaching schemas, pre-handlers (auth hooks), and controller methods.

### Controllers (`controllers/`)

Thin translation layer between HTTP requests and use case calls. Controllers parse input, call use cases, and format responses. No business logic.

### Schemas (`schemas/`)

Zod v4 schemas for request body, query string, and parameter validation. Also used for Swagger/OpenAPI documentation generation.

### Hooks (`hooks/`)

- **`requestId`** — Assigns or validates `X-Request-ID` (max 128 chars), propagates to response header.
- **`auth`** — Dual authentication: checks `X-Api-Key` header first, falls back to `Authorization: Bearer` JWT. Sets `userId`, `userEmail`, `organizationId`, `apiKeyScopes` on the request.
- **`authorization`** — Role-based access: `requireRole()`, `requireOwnership()`, `requireAdminOrOwner()`.
- **`errorHandler`** — Catches `AppError`, Fastify validation errors, and unhandled errors. Returns structured JSON error responses.

## Dependency Injection

Dependencies are wired manually in `src/app/Container.ts` via the `createContainer()` factory function. There is no DI framework.

```
createContainer()
  ├── Config (from environment)
  ├── PostgreSQLConnection → Drizzle DB instance
  ├── RedisConnection → Redis client + CacheService
  ├── JWTTokenService
  ├── Argon2PasswordHasher
  ├── 10 Drizzle*Repository instances
  ├── LLM Providers (OpenAI, Anthropic — conditional on API keys)
  ├── 22 Use Case instances
  └── 7 Controller instances
```

The `Container` interface defines all injectable dependencies. The `createApplication()` function receives a `Container` and passes the relevant parts to each route module.

## Data Flow

### Request Lifecycle

```
Client Request
    │
    ▼
┌──────────────┐
│  Fastify      │
│  (CORS,       │
│   Helmet,     │
│   RateLimit)  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  requestId    │  ← Assigns/validates X-Request-ID
│  Hook         │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Schema       │  ← Zod validates body/params/query
│  Validation   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Auth Hook    │  ← JWT or API key verification
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Org Auth     │  ← Verifies organization membership
│  Hook         │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Controller   │  ← Parses validated input
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Use Case     │  ← Business logic, calls ports
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Repository/  │  ← Infrastructure implementation
│  Provider     │
└──────┬───────┘
       │
       ▼
  Response
```

### LLM Completion Flow

```
POST /api/v1/completions
    │
    ▼
Auth Hook (JWT/API Key)
    │
    ▼
CompletionController.complete()
    │
    ▼
CompletionUseCase.execute()
    │
    ├── Resolve model → ModelRepository.findByModel()
    ├── Select provider → providers.get(model.provider)
    ├── Idempotency check → IdempotencyRepository (optional)
    ├── Concurrency check → CacheService.incrWithTTL() (Redis)
    │
    ▼
LLMProvider.generate()
    │  (OpenAI or Anthropic HTTP call)
    │
    ├── Log request → LLMRequestRepository.create()
    ├── Complete idempotency record
    └── Release concurrency slot → CacheService.decr()
    │
    ▼
CompletionResponse → Controller → Client
```

## Key Design Decisions

1. **Manual DI over frameworks** — The `Container` interface and `createContainer()` factory provide compile-time safety and full visibility into the dependency graph without framework magic.

2. **Domain ports as TypeScript interfaces** — Clean separation allows swapping implementations (e.g., different databases, LLM providers) without changing business logic.

3. **UUID primary keys** — All entities use UUIDv4 (`defaultRandom()`), safe for distributed systems and client-generated IDs.

4. **Timestamps with timezone** — All `timestamp` columns use `withTimezone: true` for consistent time handling across time zones.

5. **Soft revocation** — API keys and refresh tokens use `revokedAt` timestamps rather than hard deletes, maintaining audit trails.

6. **Hashed secrets** — API keys are stored as SHA-256 hashes. Refresh tokens are stored as SHA-256 hashes. Only the raw value is returned once at creation time.
