# Trade-offs

## 1. Monolith over Microservices

**Decision:** Single deployable application.

**Why:**

- At this stage, the API is a single bounded context. The overhead of service mesh, inter-service communication, distributed tracing, and independent deployments is not justified.
- A monolith with clean internal boundaries (domain layers) can be decomposed into microservices later if needed.
- Simpler debugging, testing, and local development. One `bun run dev` gives you the full system.
- PostgreSQL and Redis are already shared infrastructure — splitting services doesn't eliminate shared state.

**When to reconsider:** If distinct bounded contexts emerge (e.g., billing, analytics) that need independent scaling or deployment cycles.

## 2. Fastify over Express

**Decision:** Fastify 5 as the HTTP framework.

**Why:**

- **Performance:** Fastify is benchmarked 2-3x faster than Express for JSON serialization and routing, largely due to its schema-based serialization and optimized router.
- **Schema validation:** Native JSON Schema support (via `@fastify/type-provider-zod`) means validation is built into the route definition, not a separate middleware.
- **Type safety:** First-class TypeScript support with typed route handlers.
- **Plugin architecture:** Clean registration of CORS, Helmet, rate limiting, and Swagger.
- **Benchmarks:** For a gateway API that proxies to LLM providers, framework overhead should be minimal — Fastify ensures this.

**Trade-off:** Slightly smaller ecosystem than Express. Some npm packages are Express-only, but the core needs (CORS, Helmet, rate limiting) all have Fastify plugins.

## 3. Drizzle over Prisma

**Decision:** Drizzle ORM with raw `pg` driver.

**Why:**

- **SQL-like API:** Drizzle's query builder stays close to SQL, making it easy to understand generated queries and optimize performance.
- **No code generation:** Unlike Prisma, Drizzle doesn't require a codegen step. Schema changes are reflected immediately.
- **Lighter runtime:** Drizzle has minimal runtime overhead — it's essentially a typed SQL builder, not a full ORM with change tracking.
- **Migrations:** `drizzle-kit` handles migration generation and execution.
- **PostgreSQL-native:** Direct access to PostgreSQL features (JSONB arrays, specific index types) without ORM abstraction getting in the way.

**Trade-off:** Less "magical" than Prisma. No auto-generated client, no built-in relation loading. You write more explicit queries, but gain full control.

## 4. PostgreSQL over MongoDB

**Decision:** PostgreSQL 16 as the primary database.

**Why:**

- **Relational data model:** The domain has clear relationships (users → organizations → members, conversations → messages). Foreign keys, cascading deletes, and JOINs are natural here.
- **ACID transactions:** Critical for operations like creating a user + organization + membership in a single transaction.
- **Indexing flexibility:** B-tree, GIN (for JSONB/array columns), unique indexes for idempotency keys.
- **JSONB for flexible data:** `auditLogs.metadata` and `idempotencyKeys.responseBody` use JSONB for semi-structured data without losing queryability.
- **Proven reliability:** Battle-tested for multi-tenant SaaS applications.

**Trade-off:** Slightly more setup than MongoDB for simple document storage. But the relational model is a better fit for this domain.

## 5. Zod over Joi/TypeBox

**Decision:** Zod v4 for schema validation.

**Why:**

- **Type inference:** `z.infer<typeof schema>` produces TypeScript types directly from schemas — single source of truth.
- **Runtime + compile-time:** Same schema validates at runtime and provides types at compile time.
- **Error handling:** Rich, structured error messages with path information.
- **Fastify integration:** `@fastify/type-provider-zod` bridges Zod schemas to Fastify's route validation.
- **Ecosystem:** Widely adopted, excellent documentation, active maintenance.

**Trade-off:** TypeBox would be slightly faster for pure validation (JSON Schema-based), but Zod's developer experience and type inference are superior for this codebase.

## 6. Manual DI over Frameworks

**Decision:** Hand-rolled dependency injection via `Container` interface and `createContainer()` factory.

**Why:**

- **Full control:** Every dependency is explicitly wired — no magic, no reflection, no decorators.
- **Compile-time safety:** TypeScript catches missing dependencies at compile time.
- **Testability:** Tests can create partial containers with only the dependencies they need.
- **No framework overhead:** No learning curve for tsyringe, inversify, or other DI frameworks.
- **Visibility:** The entire dependency graph is visible in one file (`Container.ts`).

**Trade-off:** More boilerplate when adding new dependencies. But the clarity is worth it for a codebase of this size.

## 7. Bun over Node.js

**Decision:** Bun as the JavaScript/TypeScript runtime.

**Why:**

- **Speed:** Bun's JavaScriptCore engine and native TypeScript support provide faster startup and execution.
- **Built-in TypeScript:** No separate `ts-node` or `tsx` needed — `bun run src/index.ts` works directly.
- **Built-in test runner:** `bun test` replaces Jest/Vitest with zero configuration.
- **Bundler:** `bun build` for production builds without Webpack/Rollup.
- **Node.js compatibility:** Fastify, pg, ioredis, jose, argon2 all work with Bun.

**Trade-off:** Bun is newer than Node.js. Some edge-case compatibility issues may arise with less common npm packages. The core dependencies used here are all well-tested with Bun.

## 8. No CQRS

**Decision:** Commands and queries go through the same use case classes.

**Why:**

- The read/write ratio doesn't justify separate models yet. Most operations are straightforward CRUD.
- Adding CQRS would introduce event buses, separate read stores, and synchronization complexity.
- The current use case classes are already clean and focused.

**When to reconsider:** If read models need to be significantly different from write models (e.g., denormalized analytics views, complex search).

## 9. No Event Sourcing

**Decision:** State is stored as current state in PostgreSQL, not as an append-only event log.

**Why:**

- Event sourcing adds significant complexity: event store, projections, snapshotting, eventual consistency.
- The domain doesn't require a full audit trail of state changes (audit logs table handles the subset that's needed).
- Querying current state is simpler and faster with direct SQL.

**When to reconsider:** If the domain requires a complete, immutable history of all changes (e.g., financial ledger, compliance).

## 10. No Kafka/RabbitMQ

**Decision:** Synchronous HTTP communication, no message broker.

**Why:**

- The API is request-response: client sends a prompt, server returns a completion. No background job processing is needed yet.
- LLM provider calls are the main latency bottleneck — adding a message broker doesn't reduce that.
- Simpler operational model: fewer infrastructure components to deploy and monitor.

**When to consider:** If the system needs async workflows (e.g., batch completions, webhook notifications, background indexing).
