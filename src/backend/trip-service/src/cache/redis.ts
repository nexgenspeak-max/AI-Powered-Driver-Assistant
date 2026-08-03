/**
 * Redis cache with in-memory fallback when REDIS_URL is not set (local dev).
 */
import { config } from '../config';
import { distanceMeters, type LatLng } from '../utils/geo';

export interface GeoSearchResult {
  member: string;
  distanceMeters: number;
  lat: number;
  lng: number;
}

type RedisClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, ttl?: number): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
  geoAdd(key: string, member: string, lat: number, lng: number): Promise<void>;
  geoSearch(key: string, center: LatLng, radiusMeters: number): Promise<GeoSearchResult[]>;
};

const memory = new Map<string, { value: string; expiresAt: number }>();
const memoryGeo = new Map<string, Map<string, LatLng>>();

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
  async geoAdd(key, member, lat, lng) {
    if (!memoryGeo.has(key)) memoryGeo.set(key, new Map());
    memoryGeo.get(key)!.set(member, { lat, lng });
  },
  async geoSearch(key, center, radiusMeters) {
    const set = memoryGeo.get(key);
    if (!set) return [];
    const results: GeoSearchResult[] = [];
    for (const [member, pos] of set) {
      const d = distanceMeters(center, pos);
      if (d <= radiusMeters) results.push({ member, distanceMeters: d, lat: pos.lat, lng: pos.lng });
    }
    results.sort((a, b) => a.distanceMeters - b.distanceMeters);
    return results;
  },
};

// Thin adapter around a live ioredis connection — kept separate from
// memoryClient rather than casting the raw ioredis instance, since ioredis's
// own `.geoadd`/`.geosearch` methods don't match this interface's signature
// (different arg order / return shape), unlike get/set/del which happen to
// line up 1:1.
function makeRedisAdapter(redis: import('ioredis').Redis): RedisClient {
  return {
    get: (key) => redis.get(key),
    set: (key, value, mode, ttl) =>
      mode === 'EX' && ttl ? redis.set(key, value, 'EX', ttl) : redis.set(key, value),
    del: (...keys) => redis.del(...keys),
    async geoAdd(key, member, lat, lng) {
      await redis.call('GEOADD', key, String(lng), String(lat), member);
    },
    async geoSearch(key, center, radiusMeters) {
      const raw = (await redis.call(
        'GEOSEARCH', key,
        'FROMLONLAT', String(center.lng), String(center.lat),
        'BYRADIUS', String(radiusMeters), 'm',
        'ASC', 'WITHDIST', 'WITHCOORD',
      )) as [string, string, [string, string]][];
      return raw.map(([member, distStr, [lngStr, latStr]]) => ({
        member,
        distanceMeters: Number(distStr),
        lat: Number(latStr),
        lng: Number(lngStr),
      }));
    },
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

export async function geoAddDriver(phone: string, lat: number, lng: number): Promise<void> {
  const c = await getClient();
  await c.geoAdd(driverGeoKey(), phone, lat, lng);
}

export async function geoSearchDrivers(center: LatLng, radiusMeters: number): Promise<GeoSearchResult[]> {
  const c = await getClient();
  return c.geoSearch(driverGeoKey(), center, radiusMeters);
}

export function driverGeoKey(): string {
  return 'drivers:geo';
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
