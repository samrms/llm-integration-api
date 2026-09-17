# Testing

## Test Structure

Tests are organized into separate directories by type:

```
tests/
├── unit/           # Fast, isolated tests (no external dependencies)
├── integration/    # Tests against real PostgreSQL and Redis (testcontainers)
├── security/       # Security-focused tests
├── e2e/            # End-to-end tests hitting the full API
└── contract/       # API contract/schema tests
```

## Running Tests

```bash
# Run all tests
bun test

# Run specific suites
bun run test:unit
bun run test:integration
bun run test:security
bun run test:e2e
bun run test:contract

# Run a specific test file
bun test tests/unit/auth.test.ts

# Run tests matching a pattern
bun test --grep "signup"
```

## Unit Tests

Unit tests validate individual functions and classes in isolation. They mock external dependencies (databases, LLM providers, Redis).

**What to unit test:**

- Use case logic (success paths, error paths, edge cases)
- Domain entity behavior (creation, validation, role hierarchy)
- Zod schema validation (valid inputs, invalid inputs, boundary values)
- Utility functions (duration parsing, key hashing)

**Example:**

```typescript
// tests/unit/domain/user.test.ts
import { describe, it, expect } from "bun:test";
import { User, UserRole } from "../../../src/domain/entities/User";

describe("User", () => {
  it("lowercases email on creation", () => {
    const user = User.create({
      email: "Test@Example.com",
      passwordHash: "hashed",
    });
    expect(user.email).toBe("test@example.com");
  });

  it("throws on missing email", () => {
    expect(() => User.create({ email: "", passwordHash: "hashed" })).toThrow(
      "Email is required",
    );
  });
});
```

## Integration Tests

Integration tests run against real PostgreSQL and Redis instances managed by **Testcontainers**. They verify repository implementations, database queries, and cache behavior.

**Prerequisites:**

- Docker running (Testcontainers spins up PostgreSQL and Redis containers)
- Sufficient memory for container allocation

**What to integration test:**

- Repository CRUD operations
- Database schema constraints (unique indexes, foreign keys)
- Redis cache operations (get/set, TTL, incr, setNX)
- Full use case execution with real infrastructure

**Example:**

```typescript
// tests/integration/repositories/userRepository.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { PostgreSQLConnection } from "../../../src/infrastructure/database/PostgreSQLConnection";

describe("DrizzleUserRepository", () => {
  let db: PostgreSQLConnection;

  beforeAll(async () => {
    db = new PostgreSQLConnection(process.env.TEST_DATABASE_URL!);
    await db.connect();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  it("creates and retrieves a user", async () => {
    // ... test implementation
  });
});
```

## Security Tests

Security tests validate authentication, authorization, and input sanitization.

**What to security test:**

- JWT verification (expired tokens, invalid signatures, revoked tokens)
- API key authentication (invalid keys, revoked keys, expired keys)
- Role-based access control (insufficient permissions, cross-organization access)
- Input validation (malicious payloads, SQL injection attempts, oversized inputs)
- Rate limiting behavior

## E2E Tests

End-to-end tests exercise the full HTTP stack: Fastify server → routing → validation → auth → controller → use case → infrastructure.

**What to E2E test:**

- Complete user flows (signup → signin → create org → create API key → completion)
- Error responses (4xx, 5xx)
- Streaming responses (SSE)
- Pagination (cursor-based)

## Contract Tests

Contract tests validate that API request/response schemas match the Zod definitions and Swagger documentation.

**What to contract test:**

- Request body schema compliance
- Response shape matches OpenAPI spec
- Error response format consistency
- Header requirements (X-Request-ID)

## Test Coverage

```bash
# Run tests with coverage
bun test --coverage

# Coverage output is written to the coverage/ directory
```

Coverage targets:

- **Domain layer:** 100% (pure business logic, no excuses)
- **Application layer:** 95%+ (use case logic)
- **Infrastructure layer:** 80%+ (repository implementations)
- **Presentation layer:** 70%+ (controllers, hooks)

## Writing New Tests

### Guidelines

1. **Test behavior, not implementation.** Focus on what the code does, not how it does it.
2. **One assertion per concept.** Each `it` block tests one behavior.
3. **Descriptive names.** Use `describe` blocks for the unit under test and descriptive `it` names.
4. **Arrange-Act-Assert.** Structure tests clearly:
   ```typescript
   it("returns 401 when token is expired", async () => {
     // Arrange
     const expiredToken = await tokenService.generateAccessToken({
       sub: "1",
       email: "test@test.com",
     });
     // ... artificially expire it

     // Act
     const response = await app.inject({
       method: "GET",
       url: "/api/v1/users/me",
       headers: { authorization: `Bearer ${expiredToken}` },
     });

     // Assert
     expect(response.statusCode).toBe(401);
     expect(response.json().error.code).toBe("AUTHENTICATION_ERROR");
   });
   ```
5. **Clean up test data.** Use `beforeEach`/`afterEach` for database cleanup in integration tests.
6. **Use `bun:test`** — The project uses Bun's built-in test runner, not Jest or Vitest.
