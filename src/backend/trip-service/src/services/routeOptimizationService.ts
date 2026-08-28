// Computes the optimal order for a driver to visit ALL of their currently
// active stops (not just the single nearest one — see next_stop.py on the
// voice-agent side for that narrower feature), using real road distances
// via mapsService.getDistanceMatrix with a haversine fallback if that call
// fails for any reason. Expensive, so callers should use getOptimizedRoute()
// (cached) rather than computeOptimizedRoute() directly — the cache is
// invalidated explicitly by driverContextService.invalidateTripParties()
// whenever a trip's status changes, not recomputed on every GPS ping.
import * as tripService from './tripService';
import * as mapsService from './mapsService';
import { cacheGet, cacheSet, driverOptimizedRouteKey } from '../cache/redis';
import { distanceMeters, type LatLng } from '../utils/geo';
import { optimizeOrder, type PrecedenceOf } from '../utils/twoOpt';
import { decodePolyline } from '../utils/polyline';

// Mirrors driverContextService.ts's IN_PROGRESS / routes/drivers.ts's
// IN_PROGRESS_STATUSES — intentionally duplicated rather than imported
// (same convention as next_stop.py's _NOT_PICKED_UP_STATUSES on the Python
// side) to keep this a standalone, dependency-free computation service.
const ACTIVE_ROUTING_STATUSES = new Set(['confirmed', 'arrived_pickup', 'picked_up']);

// Only used for the haversine-fallback ETA estimate — deliberately rough,
// only ever surfaced alongside source: 'haversine_fallback' so callers can
// flag it as an estimate rather than real traffic-aware timing.
const FALLBACK_AVG_SPEED_KMH = 25;

// Safety backstop TTL — see redis.ts's comment on driverOptimizedRouteKey.
const CACHE_TTL_SECONDS = 1800;

export interface OptimizedRouteStop {
  // Not unique across `stops` — a trip not yet picked up contributes TWO
  // entries (pickup then dropoff, same trip_id, different kind) so the
  // driver sees the full one-shot leg up front instead of only learning the
  // dropoff after tapping "Đã đón khách". Pair on (trip_id, kind), not
  // trip_id alone. See candidatesFromTrips/buildPrecedence below.
  trip_id: string;
  kind: 'pickup' | 'dropoff';
  address: string;
  customer_name: string;
  lat: number;
  lng: number;
  // Both measured from the PREVIOUS stop in this order (or from the
  // driver's current location, for stops[0]).
  distance_m: number;
  eta_minutes: number;
}

export interface OptimizedRoute {
  stops: OptimizedRouteStop[];
  source: 'goong_matrix' | 'haversine_fallback';
  computed_at: string;
  driver_location: LatLng | null;
  // Road-shaped path (driver's location -> stops[0] -> stops[1] -> ...) for
  // drawing on a map, decoded from each hop's real Direction polyline. A hop
  // whose polyline fetch fails falls back to a straight 2-point segment for
  // just that hop — the rest of the path still follows real roads. Empty
  // array if no hop could be fetched at all (map falls back to straight
  // lines between stops client-side).
  path: LatLng[];
}

interface Candidate {
  trip: tripService.Trip;
  kind: 'pickup' | 'dropoff';
  address: string;
  lat: number;
  lng: number;
}

// Diverges from next_stop.py's _candidates() (which only ever wants ONE
// single "go here next" suggestion): picked_up -> dropoff only, same as
// before, but confirmed/arrived_pickup now contributes BOTH pickup AND
// dropoff — the driver hasn't picked this customer up yet, but showing only
// the pickup meant the dropoff leg was invisible until they tapped "Đã đón
// khách" mid-route. optimizeOrder's precedence constraint (built below)
// still guarantees each trip's own pickup is visited before its dropoff, so
// this can't route the driver to a drop-off before the customer is even in
// the car — it just lets the solver plan that whole one-shot "pick up here,
// then drop off there" leg alongside every other trip's stops up front,
// instead of only committing to the dropoff once already mid-trip. Trips
// missing numeric coords for a given end are skipped for just that end
// (older/text-only-address trips), same tolerance as before.
function candidatesFromTrips(trips: tripService.Trip[]): Candidate[] {
  const candidates: Candidate[] = [];
  for (const trip of trips) {
    if (!ACTIVE_ROUTING_STATUSES.has(trip.status)) continue;

    if (trip.status === 'picked_up') {
      if (typeof trip.dropoff_lat === 'number' && typeof trip.dropoff_lng === 'number') {
        candidates.push({ trip, kind: 'dropoff', address: trip.dropoff_address, lat: trip.dropoff_lat, lng: trip.dropoff_lng });
      }
      continue;
    }

    if (typeof trip.pickup_lat === 'number' && typeof trip.pickup_lng === 'number') {
      candidates.push({ trip, kind: 'pickup', address: trip.pickup_address, lat: trip.pickup_lat, lng: trip.pickup_lng });
    }
    if (typeof trip.dropoff_lat === 'number' && typeof trip.dropoff_lng === 'number') {
      candidates.push({ trip, kind: 'dropoff', address: trip.dropoff_address, lat: trip.dropoff_lat, lng: trip.dropoff_lng });
    }
  }
  return candidates;
}

// Maps each dropoff candidate's index to its own trip's pickup candidate
// index, for optimizeOrder's precedence constraint — a picked_up trip's
// lone dropoff candidate has no pickup in this list (already done, not
// re-added above) so it maps to null, same as a pickup candidate itself
// (nothing needs to precede a pickup).
function buildPrecedence(candidates: Candidate[]): PrecedenceOf {
  const pickupIndexByTripId = new Map<string, number>();
  candidates.forEach((c, i) => {
    if (c.kind === 'pickup') pickupIndexByTripId.set(c.trip.trip_id, i);
  });
  return candidates.map(c => (c.kind === 'dropoff' ? pickupIndexByTripId.get(c.trip.trip_id) ?? null : null));
}

function haversineMatrix(rows: LatLng[], cols: LatLng[]): number[][] {
  return rows.map(r => cols.map(c => distanceMeters(r, c)));
}

function etaFromDistance(distanceM: number): number {
  return Math.round((distanceM / 1000 / FALLBACK_AVG_SPEED_KMH) * 60);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const HOP_RETRY_DELAY_MS = 400;

// One hop's fetch+decode — split out of buildRoadPath so it can be retried.
// Returns null (not a throw) on any failure/empty result, same "degrade,
// don't block" contract the loop below already had.
async function fetchHopPath(from: LatLng, to: LatLng): Promise<LatLng[] | null> {
  try {
    const route = await mapsService.getRoute('', '', from, to);
    if (route.polyline) {
      const decoded = decodePolyline(route.polyline);
      if (decoded.length > 0) return decoded;
    }
  } catch {
    // fall through to null — caller logs with hop context
  }
  return null;
}

// Fetches each consecutive hop's real road-shaped path (Direction API,
// reusing the pickupCoords/dropoffCoords fast path so it never re-geocodes)
// and decodes it, so the map draws the actual street-following route instead
// of a straight line. Sequential, one retry per hop after a short delay —
// each call only has a 5s timeout (goong.ts) and a transient network blip or
// a momentary rate-limit on Goong's side (several Direction calls fired back
// to back, one per hop, right after the DistanceMatrix call above) can fail
// a single hop even though the surrounding ones succeed fine. Only after
// BOTH attempts fail does that one hop degrade to a straight 2-point
// segment — the rest of the path is unaffected either way.
async function buildRoadPath(points: LatLng[]): Promise<LatLng[]> {
  const path: LatLng[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];

    let decoded = await fetchHopPath(from, to);
    if (!decoded) {
      await sleep(HOP_RETRY_DELAY_MS);
      decoded = await fetchHopPath(from, to);
    }

    if (decoded) {
      path.push(...decoded);
    } else {
      console.warn(`[routeOptimization] hop ${i} Direction request failed after retry — using straight line for this hop`);
      path.push(from, to);
    }
  }
  return path;
}

export async function computeOptimizedRoute(
  driverPhone: string,
  trips: tripService.Trip[],
  currentLocation: LatLng | null,
): Promise<OptimizedRoute | null> {
  try {
    const candidates = candidatesFromTrips(trips);
    if (candidates.length <= 1) return null;

    console.log(`[routeOptimization] computing | driver=${driverPhone} stops=${candidates.length} hasLocation=${!!currentLocation}`);

    const stopPoints: LatLng[] = candidates.map(c => ({ lat: c.lat, lng: c.lng }));
    // No GPS fix yet (driver never went online long enough for a ping) —
    // can't measure a real "from here" leg, so just anchor the matrix at
    // the first candidate instead of failing outright (same tolerance
    // next_stop.py uses for a missing current_location).
    const originPoint = currentLocation ?? stopPoints[0];

    let costFromStart: number[];
    let costMatrix: number[][];
    let durationFromStart: (number | null)[] | null = null;
    let durationMatrix: (number | null)[][] | null = null;
    let source: 'goong_matrix' | 'haversine_fallback' = 'haversine_fallback';

    // Retried once, same reasoning as buildRoadPath's per-hop retry — a
    // single transient failure here used to nuke the ENTIRE matrix (every
    // pair falls back to haversine, not just one hop's drawn line), and
    // this call only gets bigger/slower as more trips stack up, so it's the
    // more consequential of the two calls to make resilient.
    let matrix = await mapsService.getDistanceMatrix([originPoint, ...stopPoints], stopPoints);
    const rightShape = (m: typeof matrix) =>
      !!m && m.rows.length === stopPoints.length + 1 && m.rows.every(row => row.length === stopPoints.length);
    if (!rightShape(matrix)) {
      await sleep(HOP_RETRY_DELAY_MS);
      matrix = await mapsService.getDistanceMatrix([originPoint, ...stopPoints], stopPoints);
    }

    if (rightShape(matrix)) {
      // Right shape doesn't mean every cell succeeded — Goong marks an
      // individual pair it couldn't route (per-element status, not a
      // top-level failure) with a null cell. Previously ANY null cell threw
      // out the whole matrix, meaning one bad pair among what can be dozens
      // (stops × stops, growing quadratically as more trips get added)
      // silently degraded every distance in the route to haversine, not
      // just the affected pair. Now only that specific cell falls back —
      // matches buildRoadPath's per-hop degrade-not-block philosophy, and
      // scales the same way as trip count grows instead of getting fragile.
      const m = matrix!;
      let anyCellFellBack = false;
      const fallbackDistance = (a: LatLng, b: LatLng) => {
        anyCellFellBack = true;
        return distanceMeters(a, b);
      };

      costFromStart = m.rows[0].map((c, j) =>
        typeof c.distance_m === 'number' ? c.distance_m : fallbackDistance(originPoint, stopPoints[j]),
      );
      durationFromStart = m.rows[0].map(c => c.duration_s);
      costMatrix = m.rows.slice(1).map((row, i) =>
        row.map((c, j) => (typeof c.distance_m === 'number' ? c.distance_m : fallbackDistance(stopPoints[i], stopPoints[j]))),
      );
      durationMatrix = m.rows.slice(1).map(row => row.map(c => c.duration_s));
      source = 'goong_matrix';
      if (anyCellFellBack) {
        console.warn(`[routeOptimization] some DistanceMatrix cells missing, backfilled with haversine | driver=${driverPhone}`);
      }
    } else {
      console.warn(`[routeOptimization] Goong matrix unusable after retry, falling back to haversine | driver=${driverPhone} gotMatrix=${!!matrix}`);
      costFromStart = stopPoints.map(p => distanceMeters(originPoint, p));
      costMatrix = haversineMatrix(stopPoints, stopPoints);
    }

    const precedenceOf: PrecedenceOf = buildPrecedence(candidates);
    const order = optimizeOrder(costFromStart, costMatrix, precedenceOf);

    const stops: OptimizedRouteStop[] = order.map((idx, i) => {
      const candidate = candidates[idx];
      const prevIdx = i === 0 ? null : order[i - 1];
      const distanceM = i === 0 ? costFromStart[idx] : costMatrix[prevIdx as number][idx];

      let etaMinutes: number;
      if (source === 'goong_matrix') {
        const durationS = i === 0 ? durationFromStart?.[idx] : durationMatrix?.[prevIdx as number]?.[idx];
        etaMinutes = typeof durationS === 'number' ? Math.round(durationS / 60) : etaFromDistance(distanceM);
      } else {
        etaMinutes = etaFromDistance(distanceM);
      }

      return {
        trip_id: candidate.trip.trip_id,
        kind: candidate.kind,
        address: candidate.address,
        customer_name: candidate.trip.customer_name,
        lat: candidate.lat,
        lng: candidate.lng,
        distance_m: Math.round(distanceM),
        eta_minutes: etaMinutes,
      };
    });

    console.log(
      `[routeOptimization] done | driver=${driverPhone} source=${source} order=${stops.map(s => `${s.kind}:${s.trip_id.slice(0, 8)}(${s.distance_m}m,${s.eta_minutes}min)`).join(' -> ')}`,
    );

    const orderedPoints: LatLng[] = [originPoint, ...stops.map(s => ({ lat: s.lat, lng: s.lng }))];
    const path = await buildRoadPath(orderedPoints);
    console.log(`[routeOptimization] road path built | driver=${driverPhone} points=${path.length}`);

    return {
      stops,
      source,
      computed_at: new Date().toISOString(),
      driver_location: currentLocation,
      path,
    };
  } catch (err) {
    console.warn(`[routeOptimization] compute failed for driver=${driverPhone}:`, err);
    return null;
  }
}

export async function getOptimizedRoute(
  driverPhone: string,
  trips: tripService.Trip[],
  currentLocation: LatLng | null,
): Promise<OptimizedRoute | null> {
  const key = driverOptimizedRouteKey(driverPhone);
  const cached = await cacheGet<OptimizedRoute>(key);
  if (cached) return cached;

  const computed = await computeOptimizedRoute(driverPhone, trips, currentLocation);
  if (computed) await cacheSet(key, computed, CACHE_TTL_SECONDS);
  return computed;
}
