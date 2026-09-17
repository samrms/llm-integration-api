# ADR 009: Transaction Boundaries

## Context

Some operations span multiple database writes (e.g., creating a user + organization + membership). We need to ensure these succeed or fail atomically.

## Decision

### Where Transactions Are Used

Transactions are used in use cases that perform **multiple related writes**:

- **`SignupUseCase`**: Create user → Create organization → Create membership (all in one transaction).
- **`DeleteConversationUseCase`**: Delete messages → Delete conversation (cascade is handled by foreign keys, but explicit transaction ensures consistency).

### Implementation

Drizzle ORM's `db.transaction()` provides the transaction boundary:

```typescript
await this.db.transaction(async (tx) => {
  const user = await tx.insert(users).values({...}).returning()
  const org = await tx.insert(organizations).values({...}).returning()
  await tx.insert(organizationMembers).values({...})
})
```

### Where Transactions Are NOT Used

- **Read-only operations:** No transaction needed.
- **Single writes:** Inserting a message, updating `lastUsedAt`, logging a request — these are single statements and don't need transactions.
- **LLM provider calls:** These are external HTTP calls, not database operations. They happen outside the transaction.

## Alternatives

- **No transactions:** Risk of partial writes (user created but organization not). Unacceptable for signup flow.
- **Saga pattern:** Compensating transactions for distributed systems. Overkill — all writes go to one PostgreSQL instance.
- **Eventual consistency:** Accept temporary inconsistency. Not appropriate for user signup (user expects immediate consistency).

## Consequences

- **Pro:** Atomic writes ensure data consistency for multi-step operations.
- **Pro:** PostgreSQL transactions are well-optimized — minimal overhead for short transactions.
- **Con:** Long-running transactions hold database connections. We keep transactions as short as possible (no network calls inside transactions).
- **Con:** Transaction isolation level (default: read committed) means concurrent reads may see partial state during a transaction. Acceptable for this use case.
