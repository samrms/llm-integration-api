# ADR 010: Tenant Isolation Strategy

## Context

The API is multi-tenant: multiple organizations share the same database and infrastructure. Data must be isolated — one organization cannot access another's data.

## Decision

### Shared Database, Shared Schema

All organizations share the same PostgreSQL database and schema. Isolation is enforced at the **application layer** via organization ID scoping.

### Isolation Mechanisms

1. **Every organization-scoped table has an `organization_id` column.**
   - `conversations`, `messages`, `api_keys`, `audit_logs`, `llm_requests`
   - Foreign key to `organizations.id` with `ON DELETE CASCADE`.

2. **Every query includes `organizationId` in the WHERE clause.**
   - Repository methods accept `organizationId` as a parameter.
   - No query returns data across organizations.

3. **Auth hooks verify organization membership.**
   - `createOrganizationAuthHook` checks that the authenticated user is a member of the target organization.
   - API keys are bound to a specific organization.

4. **Role-based access within organizations.**
   - `requireRole(minimumRole)` enforces Owner > Admin > Member hierarchy.
   - API keys have `scopes` for fine-grained permission control.

### Data Isolation by Table

| Table                  | Isolation                                            |
| ---------------------- | ---------------------------------------------------- |
| `users`                | Global (shared across orgs via membership)           |
| `organizations`        | Owned by one user, accessible to members             |
| `organization_members` | Scoped to organization                               |
| `refresh_tokens`       | Scoped to user + optional organization               |
| `api_keys`             | Scoped to organization                               |
| `models`               | Global (shared catalog)                              |
| `conversations`        | Scoped to organization                               |
| `messages`             | Scoped to organization (also scoped to conversation) |
| `llm_requests`         | Scoped to organization                               |
| `idempotency_keys`     | Scoped to organization                               |
| `audit_logs`           | Scoped to organization                               |

## Alternatives

- **Database-per-tenant:** Maximum isolation but high operational cost. Each tenant needs its own database, migrations, and connection pool.
- **Schema-per-tenant:** Better than DB-per-tenant but still adds migration complexity.
- **Row-level security (RLS):** PostgreSQL's built-in RLS policies could enforce isolation at the database level. More secure but adds complexity to the schema and queries.
- **No isolation (shared everything):** Simpler but a single bug could leak data across tenants.

## Consequences

- **Pro:** Simple to implement — just ensure `organizationId` is in every query.
- **Pro:** Shared infrastructure keeps operational cost low.
- **Pro:** Adding a new organization is just an INSERT — no database provisioning.
- **Con:** A bug in query scoping could leak data across tenants. Mitigated by repository-level enforcement and testing.
- **Con:** No database-level enforcement (RLS would add a safety net). Consider adding RLS if compliance requirements demand it.
- **Con:** Large organizations could cause "noisy neighbor" issues (shared connection pool, shared Redis). Mitigated by per-org concurrency limits.
