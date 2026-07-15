import * as driverService from './driverService';
import * as tripService from './tripService';
import * as earningsService from './earningsService';
import { cacheDel, cacheGet, cacheSet, driverContextKey, driverLastCallKey } from '../cache/redis';

const UPCOMING = new Set(['pending', 'notified', 'calling', 'confirmed']);
const ACTIVE = new Set(['confirmed', 'notified', 'calling', 'arrived_pickup', 'picked_up']);

function phoneVariants(phone: string): string[] {
  const p = phone.trim();
  const bare = p.replace(/^\+/, '');
  const variants = [p, bare, `+${bare}`];
  if (bare.startsWith('84')) variants.push(`0${bare.slice(2)}`);
  if (bare.startsWith('0')) variants.push(`+84${bare.slice(1)}`);
  return [...new Set(variants)];
}

async function tripsForDriver(phone: string): Promise<tripService.Trip[]> {
  const seen = new Set<string>();
  const trips: tripService.Trip[] = [];
  for (const variant of phoneVariants(phone)) {
    for (const trip of await tripService.listByDriver(variant, 50)) {
      if (trip.trip_id && !seen.has(trip.trip_id)) {
        seen.add(trip.trip_id);
        trips.push(trip);
      }
    }
  }
  return trips.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function buildDriverContext(driverPhone: string) {
  const [driver, trips, todayEarnings, lastCall] = await Promise.all([
    driverService.get(driverPhone),
    tripsForDriver(driverPhone),
    earningsService.todayForDriver(driverPhone),
    cacheGet<{ call_id: string; summary?: string }>(driverLastCallKey(driverPhone)),
  ]);

  const upcoming = trips
    .filter(t => UPCOMING.has(t.status))
    .sort((a, b) => (a.pickup_time || a.created_at).localeCompare(b.pickup_time || b.created_at));
  const currentRaw = trips.find(t => ACTIVE.has(t.status)) ?? null;
  const current = currentRaw ? earningsService.enrichTrip(currentRaw) : null;

  return {
    driver: driver ?? { phone: driverPhone, status: 'offline', name: '' },
    driver_profile: earningsService.buildProfile(driverPhone, trips),
    today_earnings: todayEarnings,
    active_bonuses: earningsService.activeBonuses(),
    upcoming_trips: upcoming.map(earningsService.enrichTrip),
    current_trip: current,
    last_call: lastCall,
    fetched_at: new Date().toISOString(),
  };
}

export async function getDriverContext(driverPhone: string, fresh = false) {
  const key = driverContextKey(driverPhone);
  if (!fresh) {
    const cached = await cacheGet<Record<string, unknown>>(key);
    if (cached) return cached;
  }
  const ctx = await buildDriverContext(driverPhone);
  await cacheSet(key, ctx);
  return ctx;
}

export async function invalidateDriverContext(driverPhone: string) {
  await cacheDel(driverContextKey(driverPhone));
}

export async function buildCustomerContext(customerPhone: string) {
  const trips = await tripService.listByCustomerPhone(customerPhone, 20);
  const active = trips.filter(
    t => !['completed', 'rejected', 'no_answer', 'cancelled', 'cancelled_by_driver'].includes(t.status),
  );
  return {
    customer_phone: customerPhone,
    trips,
    active_trip: active[0] ?? null,
    fetched_at: new Date().toISOString(),
  };
}

export async function getCustomerContext(customerPhone: string, fresh = false) {
  const { customerContextKey, cacheGet, cacheSet, cacheDel } = await import('../cache/redis');
  const key = customerContextKey(customerPhone);
  if (!fresh) {
    const cached = await cacheGet<Record<string, unknown>>(key);
    if (cached) return cached;
  }
  const ctx = await buildCustomerContext(customerPhone);
  await cacheSet(key, ctx);
  return ctx;
}

export async function invalidateCustomerContext(customerPhone: string) {
  const { customerContextKey, cacheDel } = await import('../cache/redis');
  await cacheDel(customerContextKey(customerPhone));
}

export async function invalidateTripParties(trip: tripService.Trip | null) {
  if (!trip) return;
  const tasks: Promise<void>[] = [];
  if (trip.driver_phone) tasks.push(invalidateDriverContext(trip.driver_phone));
  if (trip.customer_phone) tasks.push(invalidateCustomerContext(trip.customer_phone));
  await Promise.all(tasks);
}
