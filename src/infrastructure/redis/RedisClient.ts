import Redis from 'ioredis'
import type { CacheService } from '../../domain/ports/CacheService.js'

export class RedisConnection {
  private client: Redis | null = null

  constructor(private readonly redisUrl: string) {}

  async connect(): Promise<void> {
    this.client = new Redis(this.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 10) {
          return null
        }
        return Math.min(times * 200, 5000)
      },
      lazyConnect: true,
    })

    await this.client.connect()
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit()
      this.client = null
    }
  }

  getClient(): Redis {
    if (!this.client) {
      throw new Error(
        'Redis client not connected. Call connect() before getClient().',
      )
    }
    return this.client
  }
}

export class RedisCacheService implements CacheService {
  constructor(private readonly client: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds !== undefined && ttlSeconds > 0) {
      await this.client.set(key, value, 'EX', ttlSeconds)
    } else {
      await this.client.set(key, value)
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key)
  }

  async decr(key: string): Promise<number> {
    return this.client.decr(key)
  }

  async incrWithTTL(key: string, ttlSeconds: number): Promise<number> {
    const pipeline = this.client.pipeline()
    pipeline.incr(key)
    pipeline.expire(key, ttlSeconds)
    const results = await pipeline.exec()

    if (!results || !results[0] || results[0][1] instanceof Error) {
      throw new Error(`Failed to increment key "${key}"`)
    }

    const [, value] = results[0]
    return value as number
  }

  async setNX(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX')
    return result === 'OK'
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key)
    return result === 1
  }
}
