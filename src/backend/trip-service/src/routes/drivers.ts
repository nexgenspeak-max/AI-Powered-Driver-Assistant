import { Router, Request, Response } from 'express';
import * as driverService from '../services/driverService';
import * as tripService from '../services/tripService';
import * as earningsService from '../services/earningsService';
import * as driverContextService from '../services/driverContextService';
import * as routeOptimizationService from '../services/routeOptimizationService';
import * as mapsService from '../services/mapsService';
import { phoneVariants } from '../utils/phone';
import { distanceMeters } from '../utils/geo';
import { cacheSet, cacheGet, cacheDel, driverLiveLocationKey, driverOptimizedRouteKey, driverSessionKey } from '../cache/redis';
import { notifyDriver } from '../services/notify';
import {
  maybeNotifyCustomerOfProximity,
  maybeNotifyCustomerOfDropoffProximity,
  maybeAnnouncePickupArrivalNextStop,
  maybeAnnounceDropoffArrivalNextStop,
} from '../services/proximityService';

const router = Router();

// "Chuyến đang có" của tài xế — chỉ những chuyến THỰC SỰ còn đang diễn ra: chưa tới điểm
// đón (pending/notified/calling/confirmed) hoặc đã đón khách rồi (arrived_pickup/picked_up).
// Dùng whitelist thay vì loại trừ để không lỡ tính nhầm status mới thêm sau này vào "đang có".
// Loại hẳn: cancelled/cancelled_by_driver (đã hủy), completed (đã xong), và — quan trọng —
// rejected/no_answer (tài xế đã từ chối/không bắt máy, chuyến không còn thuộc tài xế này nữa)
// cùng no_show (khách không ra, chuyến coi như khép lại phía tài xế).
const DRIVER_ACTIVE_STATUSES = new Set(['pending', 'notified', 'calling', 'confirmed', 'arrived_pickup', 'picked_up']);
// Accepted trips only — mirrors driverContextService.ts's IN_PROGRESS. Used
// to scope runProximityChecks below (shared by POST /me/location and
// POST /me/location/live).
const IN_PROGRESS_STATUSES = new Set(['confirmed', 'arrived_pickup', 'picked_up']);

async function tripsForDriver(phone: string) {
  const seen = new Set<string>();
  const trips: Awaited<ReturnType<typeof tripService.listByDriver>> = [];
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

router.get('/', async (_req: Request, res: Response) => {
  try {
    return res.json(await driverService.listAll());
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/online', async (_req: Request, res: Response) => {
  try {
    const all = await driverService.listAll();
    return res.json(driverService.listOnline(all));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/me/trips/upcoming', async (req: Request, res: Response) => {
  try {
    const driverPhone = req.headers['x-driver-phone'] as string;
    if (!driverPhone) return res.status(400).json({ detail: 'X-Driver-Phone header required' });
    const trips = (await tripsForDriver(driverPhone)).filter(t => DRIVER_ACTIVE_STATUSES.has(t.status));
    return res.json(trips);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/me/trips/current', async (req: Request, res: Response) => {
  try {
    const driverPhone = req.headers['x-driver-phone'] as string;
    if (!driverPhone) return res.status(400).json({ detail: 'X-Driver-Phone header required' });
    const ctx = await driverContextService.getDriverContext(driverPhone);
    const active = ctx.current_trip as tripService.Trip | null;
    if (!active) return res.status(404).json({ detail: 'No active trip' });
    return res.json(active);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/me/context', async (req: Request, res: Response) => {
  try {
    const driverPhone = req.headers['x-driver-phone'] as string;
    if (!driverPhone) return res.status(400).json({ detail: 'X-Driver-Phone header required' });
    const fresh = req.query.fresh === 'true';
    return res.json(await driverContextService.getDriverContext(driverPhone, fresh));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/me/profile', async (req: Request, res: Response) => {
  try {
    const driverPhone = req.headers['x-driver-phone'] as string;
    if (!driverPhone) return res.status(400).json({ detail: 'X-Driver-Phone header required' });
    const ctx = await driverContextService.getDriverContext(driverPhone);
    return res.json(ctx.driver_profile);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/me/earnings/today', async (req: Request, res: Response) => {
  try {
    const driverPhone = req.headers['x-driver-phone'] as string;
    if (!driverPhone) return res.status(400).json({ detail: 'X-Driver-Phone header required' });
    const ctx = await driverContextService.getDriverContext(driverPhone);
    return res.json(ctx.today_earnings);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/me/earnings/summary', async (req: Request, res: Response) => {
  try {
    const driverPhone = req.headers['x-driver-phone'] as string;
    if (!driverPhone) return res.status(400).json({ detail: 'X-Driver-Phone header required' });
    const period = (req.query.period as 'week' | 'month') || 'week';
    return res.json(await earningsService.summaryForDriver(driverPhone, period));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/me/bonuses', async (_req: Request, res: Response) => {
  try {
    return res.json(earningsService.activeBonuses());
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.patch('/me/status', async (req: Request, res: Response) => {
  try {
    const driverPhone = req.headers['x-driver-phone'] as string;
    if (!driverPhone) return res.status(400).json({ detail: 'X-Driver-Phone header required' });
    const online = req.body.online ?? req.body.status === 'online';
    const status = online ? 'online' : 'offline';
    const updated = await driverService.update(driverPhone, { status });
    if (!updated) return res.status(404).json({ detail: 'Driver not found' });
    await driverContextService.invalidateDriverContext(driverPhone);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Presence: which room (if any) the driver currently has a voice session
// open in — set by voice-agent's job entrypoint on connect, cleared on
// disconnect (best-effort). Read by driverReachService.reachDriver() to
// decide whether to push a proactive nudge into the open room or dial a
// fresh one. TTL is a self-cleanup backstop only; normal disconnects always
// clear this explicitly via DELETE below.
router.put('/me/session', async (req: Request, res: Response) => {
  try {
    const driverPhone = req.headers['x-driver-phone'] as string;
    if (!driverPhone) return res.status(400).json({ detail: 'X-Driver-Phone header required' });
    const roomName = typeof req.body.room_name === 'string' ? req.body.room_name.trim() : '';
    if (!roomName) return res.status(400).json({ detail: 'room_name is required' });
    await cacheSet(driverSessionKey(driverPhone), { room_name: roomName }, 3 * 3600);
    return res.json({ status: 'ok' });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.delete('/me/session', async (req: Request, res: Response) => {
  try {
    const driverPhone = req.headers['x-driver-phone'] as string;
    if (!driverPhone) return res.status(400).json({ detail: 'X-Driver-Phone header required' });
    await cacheDel(driverSessionKey(driverPhone));
    return res.json({ status: 'ok' });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Shared by both location endpoints below: caches the fix, refreshes
// driverContext's visibility of it, and — narrowly — clears an
// optimized-route cache entry that was computed with no location fix at all
// (driver_location: null, e.g. right as the driver went online before their
// first GPS fix landed), which would otherwise anchor the visiting order on
// an arbitrary stop instead of the driver's real position until a trip
// status happens to change. Once a route has a real driver_location, this
// is a no-op — deliberately NOT wired to invalidate on every ping (route
// recompute is expensive: a Distance Matrix call + per-hop Direction calls).
async function cacheDriverLocation(driverPhone: string, lat: number, lng: number): Promise<void> {
  await cacheSet(driverLiveLocationKey(driverPhone), { lat, lng, updated_at: new Date().toISOString() }, 1200);
  // Without this, a fresh ping only becomes visible to GET /drivers/me/context
  // once its own cache (driverContextKey, up to config.cacheTtlSeconds) expires
  // on its own — so a driver who just went online could sit "on the map" as
  // stale/missing for up to that long despite the location update having landed.
  await driverContextService.invalidateDriverContext(driverPhone);

  const routeKey = driverOptimizedRouteKey(driverPhone);
  const cachedRoute = await cacheGet<{ driver_location: unknown }>(routeKey);
  if (cachedRoute && cachedRoute.driver_location === null) {
    await cacheDel(routeKey);
  }
}

// Shared by both location endpoints below — proximity-to-pickup/dropoff
// customer notification + driver next-stop nudge, per active trip. Used to
// live ONLY in POST /me/location on the theory that its ~10-min background-
// task cadence already covered this and running it on POST /me/location/live
// too would be redundant extra load. That assumption didn't hold: the
// background task (locationTracking.ts) requires background-location
// permission, which is commonly never granted (the exact reason
// /me/location/live and useLiveDriverLocation.ts's foreground stream exist
// at all — see hasLocation=false in routeOptimizationService.ts) — so for
// any driver without that permission, these checks silently never ran, no
// matter how close they got to a pickup/dropoff. Now that
// /me/location/live's own steady-state cadence (~10min, see
// useLiveDriverLocation.ts) matches what this was originally budgeted for,
// running it there too is the same load the design intended, not the 20x
// increase a 30s cadence would have been. maybeNotify*/maybeAnnounce*'s own
// per-trip "already notified" cache (1hr TTL) makes calling this from BOTH
// endpoints for the same trip safe — whichever fires first wins, the other
// is a no-op.
//
// `scope` narrows which of the two features gets evaluated — 'both' (the
// default, used by every trip-lifecycle-driven caller: the periodic pings,
// trip_confirmed, arrived_pickup/picked_up/completed) checks both, but a
// driver flipping ON just one of the two settings toggles in
// assistant-settings.tsx should only ever trigger a check of THAT feature.
// Without this, turning on "gợi ý điểm tiếp theo" (suggest, 200m) while
// "thông báo gọi khách" (notify, 1km — the wider radius) also happened to be
// on and in range fired the notify message instead, since both share this
// same check pass and notify's broader radius wins whenever both would
// qualify — confusing for a driver specifically testing the OTHER toggle
// they just turned on.
type ProximityScope = 'both' | 'notify' | 'suggest';

async function runProximityChecks(
  driverPhone: string,
  lat: number,
  lng: number,
  scope: ProximityScope = 'both',
): Promise<void> {
  const activeTrips = (await tripsForDriver(driverPhone)).filter(t => IN_PROGRESS_STATUSES.has(t.status));
  if (activeTrips.length === 0) return;

  // Only check proximity against the stop the driver is actually heading to
  // right now, and the one after that in the OPTIMIZED order — not every
  // active trip regardless of where it sits in the queue. A trip parked
  // later in the route can easily be geographically close to the driver's
  // current position by pure coincidence (that's often exactly WHY the
  // optimizer didn't send them there first — see routeOptimizationService.ts)
  // — checking it anyway used to fire a customer call or a driver nudge for
  // a stop nobody is actually about to reach yet, just because it happened
  // to be nearby. getOptimizedRoute() is cache-first (cheap on every call
  // except right after the active-stop set changes), so this doesn't add a
  // fresh Distance Matrix call of its own in the common case.
  const route = await routeOptimizationService.getOptimizedRoute(driverPhone, activeTrips, { lat, lng });

  const toCheck: { trip: tripService.Trip; kind: 'pickup' | 'dropoff' }[] = route
    ? route.stops.slice(0, 2)
        .map(stop => ({ trip: activeTrips.find(t => t.trip_id === stop.trip_id), kind: stop.kind }))
        .filter((e): e is { trip: tripService.Trip; kind: 'pickup' | 'dropoff' } => !!e.trip)
    // getOptimizedRoute returns null when there's only a single candidate
    // point total (0-1 active stops) — nothing to rank against, so just
    // check that one trip directly, same as before this change.
    : activeTrips.map(trip => {
        const kind: 'pickup' | 'dropoff' = trip.status === 'picked_up' ? 'dropoff' : 'pickup';
        return { trip, kind };
      });

  console.log(
    `[proximity] checking | driver=${driverPhone} candidates=${toCheck
      .map(({ trip, kind }) => {
        const point = kind === 'dropoff'
          ? { lat: trip.dropoff_lat, lng: trip.dropoff_lng }
          : { lat: trip.pickup_lat, lng: trip.pickup_lng };
        const d = typeof point.lat === 'number' && typeof point.lng === 'number'
          ? Math.round(distanceMeters({ lat, lng }, { lat: point.lat, lng: point.lng }))
          : null;
        return `${kind}:${trip.trip_id.slice(0, 8)}(${trip.customer_name || '?'},${d ?? '?'}m)`;
      })
      .join(' , ')}`,
  );

  // Stops after the first nudge that actually fires this cycle —
  // driverReachService.ts's pending-nudge slot holds exactly ONE nudge, not
  // a queue, so firing a second one (the same candidate's suggest right
  // after its own notify, or a later candidate's suggest) would silently
  // overwrite the first before it's ever delivered. Checking beyond index 0
  // is still useful (a later candidate becomes the right thing to suggest if
  // the immediate stop is out of range or already deduped this hour), just
  // not multiple AT ONCE — and never a customer call for anything past index
  // 0 (see below): a real driver was called for a farther pickup (766m)
  // instead of the nearer one (314m) they were actually heading to, simply
  // because it happened to be in range too and ran second in this loop.
  for (let i = 0; i < toCheck.length; i++) {
    const { trip, kind } = toCheck[i];
    let fired = false;
    // Calling the customer only ever makes sense for the stop the driver is
    // actually en route to right now (index 0) — a later candidate (index 1+)
    // exists here only so the loop still has something to act on if stop 0
    // is out of range or already deduped; it must never itself place a call
    // just because it happens to be geographically close (e.g. two pickups
    // near each other) while the driver hasn't even started heading there.
    if (i === 0 && scope !== 'suggest') {
      fired = kind === 'dropoff'
        ? await maybeNotifyCustomerOfDropoffProximity(trip, { lat, lng })
        : await maybeNotifyCustomerOfProximity(trip, { lat, lng });
    }
    if (!fired && scope !== 'notify') {
      fired = kind === 'dropoff'
        ? await maybeAnnounceDropoffArrivalNextStop(trip, { lat, lng })
        : await maybeAnnouncePickupArrivalNextStop(trip, { lat, lng });
    }
    if (fired) break;
  }
}

// Driver's periodic GPS ping while online (~every 10 min, driver-app side) —
// NOT tied to a single trip, unlike POST /trips/:tripId/location. Runs
// runProximityChecks against every trip the driver currently holds, since a
// driver can have more than one active trip. Only fires at all when
// background-location permission was granted (see locationTracking.ts) —
// POST /me/location/live below runs the exact same checks and is the
// reliable path when it wasn't.
router.post('/me/location', async (req: Request, res: Response) => {
  try {
    const driverPhone = req.headers['x-driver-phone'] as string;
    if (!driverPhone) return res.status(400).json({ detail: 'X-Driver-Phone header required' });

    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ detail: 'lat and lng must be numbers' });
    }

    console.log(`[drivers] POST /me/location | driver=${driverPhone} lat=${lat} lng=${lng}`);
    await cacheDriverLocation(driverPhone, lat, lng);
    await runProximityChecks(driverPhone, lat, lng);

    return res.json({ status: 'ok' });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Foreground-GPS-driven counterpart to POST /me/location (driver-app's
// useLiveDriverLocation.ts — first-fix-immediate, then ~10min steady state,
// same cadence as the endpoint above) plus the targeted trip-event pushes
// (pushImmediateLocation.ts, 'trip_confirmed'/'schedule_updated' handling in
// useDispatchSocket.ts) — exists purely so driverLiveLocationKey/
// optimized-route AND runProximityChecks have a real fix to work with even
// when the driver never granted background-location permission (which
// silently stops the ~10-min task above, and everything it runs, from ever
// firing). Now runs the exact same proximity checks as that endpoint —
// this used to skip them on the theory that the slower endpoint already
// covered it, which silently broke proximity notifications/next-stop nudges
// for any driver without background permission (see runProximityChecks's
// own comment for the full story). Safe to run from both: each check's own
// per-trip "already notified" cache dedupes if both endpoints fire close
// together.
router.post('/me/location/live', async (req: Request, res: Response) => {
  try {
    const driverPhone = req.headers['x-driver-phone'] as string;
    if (!driverPhone) return res.status(400).json({ detail: 'X-Driver-Phone header required' });

    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ detail: 'lat and lng must be numbers' });
    }
    // Optional — set by assistant-settings.tsx's pushImmediateLocation()
    // call right when a driver flips ON just one of the two proximity
    // toggles, so that check is scoped to the feature they actually just
    // turned on. Every other caller (periodic pings, trip-event pushes)
    // omits this and gets the default 'both'.
    const proximityScope: 'both' | 'notify' | 'suggest' =
      req.body.proximity_scope === 'notify' || req.body.proximity_scope === 'suggest'
        ? req.body.proximity_scope
        : 'both';

    await cacheDriverLocation(driverPhone, lat, lng);

    // A cache MISS here (not just the null-location case cacheDriverLocation
    // already handles above) means something recently cleared the route —
    // almost always invalidateTripParties() in routes/trips.ts, fired the
    // moment this same driver's trip became confirmed/arrived_pickup/
    // picked_up. That's exactly the scenario useDispatchSocket.ts's
    // 'trip_confirmed' handler calls this endpoint for: rebuild the route
    // right now with this fresh fix (instead of leaving it to whichever
    // client next happens to GET /me/context) and push the driver a
    // heads-up so their app refetches immediately. A routine steady-state
    // ping (~10min, or one of the targeted trip-event pushes) finds the
    // route already cached and skips all of this — never adds a Distance
    // Matrix call on its own.
    const routeKey = driverOptimizedRouteKey(driverPhone);
    const existingRoute = await cacheGet(routeKey);
    if (!existingRoute) {
      const trips = await tripsForDriver(driverPhone);
      const route = await routeOptimizationService.getOptimizedRoute(driverPhone, trips, { lat, lng });
      if (route) await notifyDriver(driverPhone, 'schedule_updated', {});
    }

    await runProximityChecks(driverPhone, lat, lng, proximityScope);

    return res.json({ status: 'ok' });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Turn-by-turn directions for ONE leg (driver's current position -> a single
// target point, e.g. optimized_route.stops[0]) — powers driver-app's
// in-app navigation HUD. Deliberately stateless/point-to-point rather than
// keyed off driver context: the client already has its own live GPS fix
// (fresher than whatever's cached server-side) and knows which stop it's
// currently navigating to, so there's nothing to look up here beyond the
// provider call itself. `vehicle=car` throughout mapsService's Goong/Google
// providers already means "shortest/fastest route for a car" — same
// provider call routeOptimizationService.ts uses for the multi-stop path,
// just requested for a single leg with `steps` this time.
router.get('/me/navigation', async (req: Request, res: Response) => {
  try {
    const fromLat = Number(req.query.from_lat);
    const fromLng = Number(req.query.from_lng);
    const toLat = Number(req.query.to_lat);
    const toLng = Number(req.query.to_lng);
    if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) {
      return res.status(400).json({ detail: 'from_lat, from_lng, to_lat, to_lng must all be numbers' });
    }

    const route = await mapsService.getRoute('', '', { lat: fromLat, lng: fromLng }, { lat: toLat, lng: toLng });
    if (!route.polyline) {
      return res.status(502).json({ detail: 'Không lấy được chỉ đường lúc này, vui lòng thử lại.' });
    }

    return res.json({
      distance_km: route.distance_km ?? null,
      eta_minutes: route.eta_minutes ?? null,
      traffic_note: route.traffic_note ?? '',
      polyline: route.polyline,
      steps: route.steps ?? [],
    });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/:phone', async (req: Request, res: Response) => {
  try {
    const driver = await driverService.get(req.params.phone);
    if (!driver) return res.status(404).json({ detail: 'Driver not found' });
    return res.json(driver);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.patch('/:phone', async (req: Request, res: Response) => {
  try {
    const driver = await driverService.get(req.params.phone);
    if (!driver) return res.status(404).json({ detail: 'Driver not found' });

    const fields: Record<string, unknown> = {};
    for (const k of ['name', 'fcm_token', 'status']) {
      if (req.body[k] != null) fields[k] = req.body[k];
    }
    if (!Object.keys(fields).length) return res.json(driver);
    if (fields.status && !['online', 'offline'].includes(fields.status as string)) {
      return res.status(400).json({ detail: 'status must be online or offline' });
    }
    const updated = await driverService.update(req.params.phone, fields);
    await driverContextService.invalidateDriverContext(req.params.phone);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
