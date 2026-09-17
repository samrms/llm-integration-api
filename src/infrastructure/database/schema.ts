import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').unique().notNull(),
    passwordHash: text('password_hash').notNull(),
    name: text('name'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('idx_users_email').on(table.email)],
)

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// ---------------------------------------------------------------------------
// Organization Members
// ---------------------------------------------------------------------------
export const organizationMembers = pgTable(
  'organization_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_organization_members_org_user').on(
      table.organizationId,
      table.userId,
    ),
    index('idx_organization_members_organization_id').on(table.organizationId),
  ],
)

// ---------------------------------------------------------------------------
// Refresh Tokens
// ---------------------------------------------------------------------------
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id').references(() => organizations.id),
    tokenHash: text('token_hash').notNull(),
    family: text('family').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_refresh_tokens_user_id').on(table.userId),
    index('idx_refresh_tokens_family').on(table.family),
  ],
)

// ---------------------------------------------------------------------------
// API Keys
// ---------------------------------------------------------------------------
export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    prefix: text('prefix').notNull(),
    keyHash: text('key_hash').notNull(),
    scopes: text('scopes').array().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_api_keys_organization_id').on(table.organizationId),
    index('idx_api_keys_prefix').on(table.prefix),
  ],
)

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------
export const models = pgTable('models', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  displayName: text('display_name').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  contextWindow: integer('context_window').notNull(),
  supportsStreaming: boolean('supports_streaming').notNull().default(true),
  supportsTools: boolean('supports_tools').notNull().default(false),
  supportsVision: boolean('supports_vision').notNull().default(false),
  inputCostPer1k: numeric('input_cost_per_1k').notNull().default('0'),
  outputCostPer1k: numeric('output_cost_per_1k').notNull().default('0'),
  currency: text('currency').notNull().default('USD'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id),
    title: text('title'),
    model: text('model'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_conversations_org_created').on(
      table.organizationId,
      table.createdAt,
    ),
  ],
)

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    content: text('content').notNull(),
    tokenCount: integer('token_count'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_messages_conversation_created').on(
      table.conversationId,
      table.createdAt,
    ),
  ],
)

// ---------------------------------------------------------------------------
// LLM Requests
// ---------------------------------------------------------------------------
export const llmRequests = pgTable(
  'llm_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').references(() => organizations.id),
    userId: uuid('user_id'),
    requestId: text('request_id').notNull(),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    inputTokens: integer('input_tokens').notNull(),
    outputTokens: integer('output_tokens').notNull(),
    totalTokens: integer('total_tokens').notNull(),
    durationMs: integer('duration_ms').notNull(),
    status: text('status').notNull(),
    errorMessage: text('error_message'),
    conversationId: uuid('conversation_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_llm_requests_org_created').on(
      table.organizationId,
      table.createdAt,
    ),
  ],
)

// ---------------------------------------------------------------------------
// Idempotency Keys
// ---------------------------------------------------------------------------
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id'),
    key: text('key').notNull(),
    requestFingerprint: text('request_fingerprint').notNull(),
    status: text('status').notNull(),
    responseStatusCode: integer('response_status_code'),
    responseBody: text('response_body'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_idempotency_keys_key_org').on(table.key, table.organizationId),
    uniqueIndex('uidx_idempotency_keys_key_org').on(
      table.key,
      table.organizationId,
    ),
  ],
)

// ---------------------------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------------------------
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id'),
    userId: uuid('user_id'),
    action: text('action').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_audit_logs_org_created').on(
      table.organizationId,
      table.createdAt,
    ),
  ],
)
