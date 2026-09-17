import { Pool } from 'pg'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from './schema.js'

export class PostgreSQLConnection {
  private pool: Pool | null = null
  private db: NodePgDatabase<typeof schema> | null = null

  constructor(private readonly databaseUrl: string) {}

  async connect(): Promise<void> {
    this.pool = new Pool({
      connectionString: this.databaseUrl,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })

    this.db = drizzle(this.pool, { schema })

    // Verify the connection is alive
    const client = await this.pool.connect()
    try {
      await client.query('SELECT 1')
    } finally {
      client.release()
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
      this.db = null
    }
  }

  getDb(): NodePgDatabase<typeof schema> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() before getDb().')
    }
    return this.db
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call connect() first.')
    }
    return this.pool
  }
}
