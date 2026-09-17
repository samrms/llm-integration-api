# ADR 002: Manual Dependency Injection

## Context

We need to wire together repositories, services, use cases, and controllers. The dependency graph is moderately complex (10 repositories, 2 services, 22 use cases, 7 controllers).

## Decision

Use **manual dependency injection** via a `Container` interface and `createContainer()` factory function. No DI framework.

```typescript
export interface Container {
  config: Config;
  db: PostgreSQLConnection;
  redis: RedisConnection;
  cache: RedisCacheService;
  userRepo: DrizzleUserRepository;
  // ... all dependencies explicitly listed
}

export async function createContainer(): Promise<Container> {
  // Wire everything together in order
}
```

## Alternatives

- **tsyringe / inversify:** Decorator-based DI with container reflection. Adds runtime magic, harder to trace dependencies, TypeScript decorator compatibility issues with Bun.
- **Awilix:** Function-based DI with lifetime management. Good, but adds a dependency for something we can do ourselves.
- **NestJS:** Full framework with built-in DI. Too opinionated and heavyweight for our needs.
- **Function parameters:** Pass dependencies as function arguments. Doesn't scale well when the same set of dependencies is passed to many constructors.

## Consequences

- **Pro:** Every dependency is explicitly visible in one file. No magic, no reflection.
- **Pro:** TypeScript catches missing dependencies at compile time.
- **Pro:** Tests can create partial containers easily.
- **Pro:** Zero runtime overhead.
- **Con:** Adding a new dependency requires updating the `Container` interface and `createContainer()`.
- **Con:** More boilerplate than framework-based DI.

For a codebase of this size, the explicitness is worth the boilerplate.
