# ADR 003: PostgreSQL + Drizzle ORM

## Context

We need a database for persistent storage of users, organizations, API keys, conversations, messages, LLM request logs, and idempotency records. The data model is relational with clear entity relationships.

## Decision

Use **PostgreSQL 16** as the database and **Drizzle ORM** as the query builder/ORM.

### PostgreSQL

- UUIDv4 primary keys on all tables
- Timestamps with timezone (`withTimezone: true`)
- JSONB columns for semi-structured data (`audit_logs.metadata`, `idempotency_keys.response_body`)
- Array columns for API key scopes (`api_keys.scopes`)
- Composite and unique indexes for query performance

### Drizzle ORM

- Schema defined in TypeScript (`src/infrastructure/database/schema.ts`)
- `pg` driver (not `@neondatabase/serverless` — we use a connection pool)
- `drizzle-kit` for migration generation and execution
- Typed query builder — no raw SQL strings

## Alternatives

- **Prisma:** More magical, requires codegen step, heavier runtime. Good DX but less control.
- **TypeORM:** Decorator-based, less TypeScript-native, historically slower adoption of new PG features.
- **MikroORM:** Feature-rich but heavy. Better suited for complex domain models with identity maps.
- **MongoDB:** Document store doesn't fit the relational data model (users → orgs → members → conversations → messages).

## Consequences

- **Pro:** SQL-like queries with full type safety.
- **Pro:** No codegen step — schema changes are immediate.
- **Pro:** Direct access to PostgreSQL features (JSONB, arrays, specific index types).
- **Pro:** Lightweight runtime compared to Prisma.
- **Con:** Less built-in relation loading (no automatic JOINs for related entities).
- **Con:** Smaller community than Prisma, but growing rapidly.
- **Pro:** Connection pool (max 20, idle timeout 30s) provides efficient connection reuse.
