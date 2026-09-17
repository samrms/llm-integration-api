import type { FastifyInstance } from 'fastify'
import type { PostgreSQLConnection } from '../../infrastructure/database/PostgreSQLConnection.js'
import type { RedisConnection } from '../../infrastructure/redis/RedisClient.js'

export interface HealthRoutesDeps {
  db: PostgreSQLConnection
  redis: RedisConnection
}

export async function healthRoutes(
  fastify: FastifyInstance,
  deps: HealthRoutesDeps,
): Promise<void> {
  fastify.get('/health', async (_request, reply) => {
    reply.send({ status: 'ok', timestamp: new Date().toISOString() })
  })

  fastify.get('/health/ready', async (_request, reply) => {
    const checks: Record<string, { status: string; latencyMs?: number }> = {}
    let healthy = true

    // Check database
    const dbStart = Date.now()
    try {
      const pool = deps.db.getPool()
      const client = await pool.connect()
      try {
        await client.query('SELECT 1')
        checks.database = {
          status: 'ok',
          latencyMs: Date.now() - dbStart,
        }
      } finally {
        client.release()
      }
    } catch {
      checks.database = { status: 'error', latencyMs: Date.now() - dbStart }
      healthy = false
    }

    // Check Redis
    const redisStart = Date.now()
    try {
      const client = deps.redis.getClient()
      await client.ping()
      checks.redis = {
        status: 'ok',
        latencyMs: Date.now() - redisStart,
      }
    } catch {
      checks.redis = { status: 'error', latencyMs: Date.now() - redisStart }
      healthy = false
    }

    reply.code(healthy ? 200 : 503).send({
      status: healthy ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    })
  })
}
