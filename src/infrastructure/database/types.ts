import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from './schema.js'

/** Drizzle database type parameterized with the actual schema. */
export type AppDatabase = NodePgDatabase<typeof schema>
