export interface CacheService {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds?: number): Promise<void>
  del(key: string): Promise<void>
  incr(key: string): Promise<number>
  decr(key: string): Promise<number>
  incrWithTTL(key: string, ttlSeconds: number): Promise<number>
  setNX(key: string, value: string, ttlSeconds: number): Promise<boolean>
  exists(key: string): Promise<boolean>
}
