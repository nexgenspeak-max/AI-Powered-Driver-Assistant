import { config } from '../config';
import * as driverService from './driverService';
import * as tripService from './tripService';
import * as earningsService from './earningsService';
import * as driverSettingsService from './driverSettingsService';
import * as routeOptimizationService from './routeOptimizationService';
import { cacheDel, cacheGet, cacheSet, driverContextKey, driverLastCallKey, driverLiveLocationKey, driverOptimizedRouteKey, driverPendingNudgeKey } from '../cache/redis';
import { phoneVariants } from '../utils/phone';

interface DriverLiveLocation {
  lat: number;
  lng: number;
  updated_at: string;
}

// "Chuyến đang có" — chỉ chuyến THỰC SỰ còn đang diễn ra (chưa tới điểm đón hoặc đã đón
// khách rồi). Loại hẳn cancelled/cancelled_by_driver/completed lẫn rejected/no_answer (tài
// xế đã từ chối/không bắt máy — chuyến không còn thuộc tài xế này) và no_show (khách không
// ra — coi như khép lại). Mirrors routes/drivers.ts's DRIVER_ACTIVE_STATUSES.
const DRIVER_ACTIVE_STATUSES = new Set(['pending', 'notified', 'calling', 'confirmed', 'arrived_pickup', 'picked_up']);
// Every trip the driver has actually ACCEPTED and is executing right now.
// `current_trip` below is picked from this same set — it used to also
// match notified/calling (a trip offered but NOT YET accepted/confirmed by
// the driver), which made get_current_trip_info answer "which trip am I
// currently heading to" with a trip the driver hadn't even agreed to take
// yet — confusing/wrong. A trip still awaiting the driver's own
// confirm/reject isn't "current" in any meaningful sense; it belongs under
// check_upcoming_trips(scope="awaiting_confirmation") instead.
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
  const [driver, trips, todayEarnings, lastCall, currentLocation, pendingNudge, driverSettings] = await Promise.all([
    driverService.get(driverPhone),
    tripsForDriver(driverPhone),
    earningsService.todayForDriver(driverPhone),
    cacheGet<{ call_id: string; summary?: string }>(driverLastCallKey(driverPhone)),
    cacheGet<DriverLiveLocation>(driverLiveLocationKey(driverPhone)),
    cacheGet<{ kind: string }>(driverPendingNudgeKey(driverPhone)),
    driverSettingsService.getByPhone(driverPhone),
  ]);

  const upcoming = trips
    .filter(t => DRIVER_ACTIVE_STATUSES.has(t.status))
    .sort((a, b) => (a.pickup_time || a.created_at).localeCompare(b.pickup_time || b.created_at));
  const inProgress = trips
    .filter(t => IN_PROGRESS.has(t.status))
    .sort((a, b) => (a.pickup_time || a.created_at).localeCompare(b.pickup_time || b.created_at));
  // Driver-app's "Đã hoàn thành" tab — deliberately `completed` only (not
  // cancelled/rejected/no_answer/no_show too): those never made it onto the
  // driver's plate as a real trip they ran, so they don't belong in a list
  // that's meant to read as "trips I've done". `trips` is already this
  // driver's most recent 50 (tripsForDriver above), newest first.
  const completed = trips.filter(t => t.status === 'completed');
  const currentRaw = trips.find(t => IN_PROGRESS.has(t.status)) ?? null;
  const current = currentRaw ? earningsService.enrichTrip(currentRaw) : null;

  // Depends on `trips`/`currentLocation` already resolved above, so it can't
  // join the Promise.all — cached internally (routeOptimizationService.ts),
  // so this is a no-op read on every call except right after a real
  // active-stop-set change (see invalidateTripParties below).
  const optimizedRoute = await routeOptimizationService.getOptimizedRoute(
    driverPhone,
    trips,
    currentLocation ?? null,
  );

  return {
    driver: driver ?? { phone: driverPhone, status: 'offline', name: '' },
    driver_profile: earningsService.buildProfile(driverPhone, trips),
    today_earnings: todayEarnings,
    active_bonuses: earningsService.activeBonuses(),
    upcoming_trips: upcoming.map(earningsService.enrichTrip),
    active_trips: inProgress.map(earningsService.enrichTrip),
    completed_trips: completed.map(earningsService.enrichTrip),
    current_trip: current,
    // From the ~10-min online GPS ping (POST /drivers/me/location) — used by
    // voice-agent's suggest_next_stop tool to pick the nearest pending
    // pickup/dropoff. null until the driver has gone online at least once.
    current_location: currentLocation ?? null,
    // True when reachDriver() couldn't push a nudge live (no session open —
    // see driverReachService.ts) and saved it for later instead. driver-app
    // polls this to auto-open a voice session ONLY when there's something
    // waiting (never unconditionally on app open) — see POST /voice/token
    // for where the actual nudge gets embedded into the new room.
    has_pending_nudge: pendingNudge !== null,
    last_call: lastCall,
    // Feature toggles from auth-service's driver-settings table (hands_free_mode,
    // notify_on_pickup_approach, auto_suggest_next_stop + their radii). All-false
    // shape if the account/settings row can't be resolved, so callers (voice-agent's
    // next_stop.py) can treat a missing row the same as an explicitly-off one.
    driver_settings: driverSettings ?? {
      hands_free_mode: false,
      notify_on_pickup_approach: false,
      notify_on_pickup_approach_radius_m: config.proximityAlertMeters,
      auto_suggest_next_stop: false,
      auto_suggest_next_stop_radius_m: config.nextStopAnnounceMeters,
    },
    // Multi-stop visiting order across ALL active stops (confirmed/
    // arrived_pickup/picked_up), road-distance-based via Goong Distance
    // Matrix with a haversine fallback. null when the driver has 0-1 active
    // stops (nothing to order) or trips lack coords. Cached, invalidated on
    // active-stop-set change (see invalidateTripParties below) — NOT
    // recomputed on every GPS ping.
    optimized_route: optimizedRoute,
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

// Trip actually has a driver en route (accepted, not just offered) — a
// pending/notified/calling trip hasn't been confirmed by anyone yet, so
// there's no live position to show for it. Mirrors driver-side IN_PROGRESS
// above, just named separately since it's evaluated against a customer's
// own trip list, not a driver's.
const CUSTOMER_DRIVER_EN_ROUTE_STATUSES = new Set(['confirmed', 'arrived_pickup', 'picked_up']);

export async function buildCustomerContext(customerPhone: string) {
  const trips = await tripService.listByCustomerPhone(customerPhone, 20);
  const active = trips.filter(
    t => !['completed', 'rejected', 'no_answer', 'cancelled', 'cancelled_by_driver'].includes(t.status),
  );
  // Last known position of whichever active trip's driver is actually en
  // route — same driverLiveLocationKey cache driver-app's own GET
  // /drivers/me/context reads as current_location (populated by
  // useLiveDriverLocation's throttled push plus the arrival-radius-checked
  // pushes on arrived_pickup/picked_up/completed in routes/trips.ts). null
  // until that driver has gone online/moved at least once, or while the
  // trip is still awaiting the driver's own accept.
  const enRouteTrip = active.find(t => CUSTOMER_DRIVER_EN_ROUTE_STATUSES.has(t.status) && t.driver_phone) ?? null;
  const driverLocation = enRouteTrip?.driver_phone
    ? await cacheGet<DriverLiveLocation>(driverLiveLocationKey(enRouteTrip.driver_phone))
    : null;
  return {
    customer_phone: customerPhone,
    trips,
    active_trip: active[0] ?? null,
    // Full non-terminal trip list (not just the first one) — customer-app's
    // home map draws a pickup/dropoff pin per entry here, same spatial-
    // overview idea as driver-app's own DriverMap over active_trips.
    active_trips: active,
    driver_location: driverLocation ?? null,
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
  if (trip.driver_phone) {
    tasks.push(invalidateDriverContext(trip.driver_phone));
    // A status write can move a trip INTO or OUT OF the active-routing set
    // (confirmed/arrived_pickup/picked_up) — always invalidate the cached
    // optimized route alongside driver context; a stale route missing a
    // newly-confirmed stop (or still including a completed one) is actively
    // misleading, not just outdated. Cheap: this only deletes a cache key,
    // actual recomputation happens lazily on the next context read.
    tasks.push(cacheDel(...phoneVariants(trip.driver_phone).map(driverOptimizedRouteKey)));
  }
  if (trip.customer_phone) tasks.push(invalidateCustomerContext(trip.customer_phone));
  await Promise.all(tasks);
}
