/**
 * Redis cache with in-memory fallback when REDIS_URL is not set (local dev).
 */
import { config } from '../config';
import { getLogger } from '../services/logger';

const log = getLogger('cache');

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
    log.info('REDIS_URL not set — using in-memory cache');
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
    log.info('connected to Redis');
    return client;
  } catch (err) {
    log.warning('Redis unavailable, using in-memory fallback', {
      error: err instanceof Error ? err.message : String(err),
    });
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

// The driver's multi-stop optimized visiting order (routeOptimizationService.ts)
// — expensive to compute (a Distance Matrix call + 2-opt), so kept until the
// active-stop SET changes (see invalidateTripParties in driverContextService.ts),
// not TTL-driven staleness like driverContext's own cache. The TTL passed here
// is just a safety backstop against a missed invalidation, not the primary
// invalidation mechanism.
export function driverOptimizedRouteKey(phone: string): string {
  return `driver:optimized_route:${phone.replace(/^\+/, '')}`;
}

export function driverLastCallKey(phone: string): string {
  return `driver:last_call:${phone.replace(/^\+/, '')}`;
}

export function driverLocationKey(tripId: string): string {
  return `trip:driver_location:${tripId}`;
}

// Driver's periodic GPS ping while online (every ~10 min, independent of any
// single trip) — separate from driverLocationKey above, which is keyed per
// trip and only fed by the old per-trip tracking endpoint.
export function driverLiveLocationKey(phone: string): string {
  return `driver:live_location:${phone.replace(/^\+/, '')}`;
}

export function tripProximityNotifiedKey(tripId: string): string {
  return `trip:proximity_notified:${tripId}`;
}

export function tripDropoffProximityNotifiedKey(tripId: string): string {
  return `trip:dropoff_proximity_notified:${tripId}`;
}

// Separate dedupe pair for the closer ~200m "arriving, here's the optimal
// next stop" announcement — independent of the 1km call-offer flags above,
// since both can legitimately fire once each for the same trip.
export function tripArrivalAnnouncedKey(tripId: string): string {
  return `trip:arrival_announced:${tripId}`;
}

export function tripDropoffArrivalAnnouncedKey(tripId: string): string {
  return `trip:dropoff_arrival_announced:${tripId}`;
}

// The driver's currently open voice session (if any) — set by voice-agent
// when a driver job connects, cleared when it disconnects. Read by
// driverReachService.ts to decide whether to push a proactive nudge into
// the open room or open a brand new one. Long TTL (a few hours) is just a
// self-cleanup backstop in case a job crashes before clearing it — normal
// disconnects always clear it explicitly.
export function driverSessionKey(phone: string): string {
  return `driver:session:${phone.replace(/^\+/, '')}`;
}

// A nudge that couldn't be delivered live (driver had no session open, and
// reachDriver no longer places a phone call to force one open) — held here
// until the driver opens the app on their own (POST /voice/token embeds it
// into that room's metadata, then clears this key). TTL caps how stale a
// nudge can get before it's just dropped instead of surprising the driver
// with a long-outdated "you're near pickup" hours later.
export function driverPendingNudgeKey(phone: string): string {
  return `driver:pending_nudge:${phone.replace(/^\+/, '')}`;
}
