import * as driverService from './driverService';
import * as tripService from './tripService';
import * as earningsService from './earningsService';
import { cacheDel, cacheGet, cacheSet, driverContextKey, driverLastCallKey } from '../cache/redis';
import { phoneVariants } from '../utils/phone';

// "Chuyến đang có" — chỉ chuyến THỰC SỰ còn đang diễn ra (chưa tới điểm đón hoặc đã đón
// khách rồi). Loại hẳn cancelled/cancelled_by_driver/completed lẫn rejected/no_answer (tài
// xế đã từ chối/không bắt máy — chuyến không còn thuộc tài xế này) và no_show (khách không
// ra — coi như khép lại). Mirrors routes/drivers.ts's DRIVER_ACTIVE_STATUSES.
const DRIVER_ACTIVE_STATUSES = new Set(['pending', 'notified', 'calling', 'confirmed', 'arrived_pickup', 'picked_up']);
const ACTIVE = new Set(['confirmed', 'notified', 'calling', 'arrived_pickup', 'picked_up']);
// Every trip the driver has actually accepted and is executing right now —
// unlike ACTIVE above (which also matches notified/calling, used only to
// pick a single `current_trip`), this covers arrived_pickup/picked_up too,
// so a driver holding more than one accepted trip at once (e.g. wrapping up
// one ride while already confirmed for the next pickup) doesn't lose the
// other one: `current_trip` only ever surfaces a single trip, so anything
// past confirmed that isn't picked as `current_trip` would otherwise never
// appear in the response at all.
const IN_PROGRESS = new Set(['confirmed', 'arrived_pickup', 'picked_up']);

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
    .filter(t => DRIVER_ACTIVE_STATUSES.has(t.status))
    .sort((a, b) => (a.pickup_time || a.created_at).localeCompare(b.pickup_time || b.created_at));
  const inProgress = trips
    .filter(t => IN_PROGRESS.has(t.status))
    .sort((a, b) => (a.pickup_time || a.created_at).localeCompare(b.pickup_time || b.created_at));
  const currentRaw = trips.find(t => ACTIVE.has(t.status)) ?? null;
  const current = currentRaw ? earningsService.enrichTrip(currentRaw) : null;

  return {
    driver: driver ?? { phone: driverPhone, status: 'offline', name: '' },
    driver_profile: earningsService.buildProfile(driverPhone, trips),
    today_earnings: todayEarnings,
    active_bonuses: earningsService.activeBonuses(),
    upcoming_trips: upcoming.map(earningsService.enrichTrip),
    active_trips: inProgress.map(earningsService.enrichTrip),
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
  // driverContextKey only strips a leading '+' — it does not fold the
  // '0xxxxxxxxx' / '84xxxxxxxxx' formats together. A trip's stored
  // driver_phone and the format the driver's own session reads the cache
  // under (X-Driver-Phone header) can differ, so invalidating only the raw
  // input phone can miss the actual cached entry, leaving it to serve a
  // stale snapshot (e.g. pre-completion earnings) until its TTL expires.
  // Invalidate every phone-variant's key to guarantee the real one is hit.
  await cacheDel(...phoneVariants(driverPhone).map(driverContextKey));
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
