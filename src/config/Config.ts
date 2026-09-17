import { z } from 'zod'

const configSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z
    .string()
    .url()
    .or(z.string().startsWith('postgresql://'))
    .or(z.string().startsWith('postgres://')),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(7),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((val) =>
      val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  ARGON2_TIME_COST: z.coerce.number().int().positive().default(3),
  ARGON2_MEMORY_COST: z.coerce.number().int().positive().default(65536),
  ARGON2_PARALLELISM: z.coerce.number().int().positive().default(4),
  COMPLETION_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  STREAMING_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  MAX_CONCURRENT_LLM_REQUESTS: z.coerce.number().int().positive().default(10),
  MAX_BODY_SIZE: z.string().default('1mb'),
  API_KEY_PREFIX: z.string().default('llm_live_'),
})

export type Config = z.infer<typeof configSchema>

let cachedConfig: Config | null = null

export function loadConfig(): Config {
  if (cachedConfig) {
    return cachedConfig
  }

  const result = configSchema.safeParse(process.env)

  if (!result.success) {
    const formatted = result.error.format()
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n')

    throw new Error(
      `Invalid configuration:\n${issues}\n\nFull errors:\n${JSON.stringify(formatted, null, 2)}`,
    )
  }

  cachedConfig = result.data
  return cachedConfig
}
