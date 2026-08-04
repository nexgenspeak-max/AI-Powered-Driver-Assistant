/**
 * Redis cache with in-memory fallback when REDIS_URL is not set (local dev).
 */
import { config } from '../config';

type RedisClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, ttl?: number): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
};

const memory = new Map<string, { value: string; expiresAt: number }>();

const memoryClient: RedisClient = {
  async get(key) {
    const item = memory.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      memory.delete(key);
      return null;
    }
    return item.value;
  },
  async set(key, value, mode?, ttl?) {
    const expiresAt = mode === 'EX' && ttl ? Date.now() + ttl * 1000 : 0;
    memory.set(key, { value, expiresAt });
    return 'OK';
  },
  async del(...keys) {
    for (const k of keys) memory.delete(k);
    return keys.length;
  },
};

function makeRedisAdapter(redis: import('ioredis').Redis): RedisClient {
  return {
    get: (key) => redis.get(key),
    set: (key, value, mode, ttl) =>
      mode === 'EX' && ttl ? redis.set(key, value, 'EX', ttl) : redis.set(key, value),
    del: (...keys) => redis.del(...keys),
  };
}

let client: RedisClient | null = null;
let initAttempted = false;

async function getClient(): Promise<RedisClient> {
  if (client) return client;
  if (initAttempted) return memoryClient;
  initAttempted = true;

  if (!config.redisUrl) {
    console.info('[cache] REDIS_URL not set — using in-memory cache');
    client = memoryClient;
    return client;
  }

  try {
    const { default: Redis } = await import('ioredis');
    const redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 2000,
    });
    await redis.connect();
    client = makeRedisAdapter(redis);
    console.info('[cache] connected to Redis');
    return client;
  } catch (err) {
    console.warn('[cache] Redis unavailable, using in-memory fallback:', err);
    client = memoryClient;
    return client;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const c = await getClient();
  const raw = await c.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = config.cacheTtlSeconds): Promise<void> {
  const c = await getClient();
  await c.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (!keys.length) return;
  const c = await getClient();
  await c.del(...keys);
}

export function driverContextKey(phone: string): string {
  return `driver:context:${phone.replace(/^\+/, '')}`;
}

export function customerContextKey(phone: string): string {
  return `customer:context:${phone.replace(/^\+/, '')}`;
}

export function driverLastCallKey(phone: string): string {
  return `driver:last_call:${phone.replace(/^\+/, '')}`;
}

export function driverLocationKey(tripId: string): string {
  return `trip:driver_location:${tripId}`;
}

export function tripProximityNotifiedKey(tripId: string): string {
  return `trip:proximity_notified:${tripId}`;
}
