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
import { optimizeOrder } from '../utils/twoOpt';
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

// Mirrors next_stop.py's _candidates(): confirmed/arrived_pickup -> head to
// pickup, picked_up -> head to dropoff. Trips missing numeric coords are
// skipped (older/text-only-address trips), same tolerance as elsewhere.
function candidatesFromTrips(trips: tripService.Trip[]): Candidate[] {
  const candidates: Candidate[] = [];
  for (const trip of trips) {
    if (!ACTIVE_ROUTING_STATUSES.has(trip.status)) continue;

    const kind: 'pickup' | 'dropoff' = trip.status === 'picked_up' ? 'dropoff' : 'pickup';
    const lat = kind === 'dropoff' ? trip.dropoff_lat : trip.pickup_lat;
    const lng = kind === 'dropoff' ? trip.dropoff_lng : trip.pickup_lng;
    const address = kind === 'dropoff' ? trip.dropoff_address : trip.pickup_address;
    if (typeof lat !== 'number' || typeof lng !== 'number') continue;

    candidates.push({ trip, kind, address, lat, lng });
  }
  return candidates;
}

function haversineMatrix(rows: LatLng[], cols: LatLng[]): number[][] {
  return rows.map(r => cols.map(c => distanceMeters(r, c)));
}

function etaFromDistance(distanceM: number): number {
  return Math.round((distanceM / 1000 / FALLBACK_AVG_SPEED_KMH) * 60);
}

// Fetches each consecutive hop's real road-shaped path (Direction API,
// reusing the pickupCoords/dropoffCoords fast path so it never re-geocodes)
// and decodes it, so the map draws the actual street-following route instead
// of a straight line. A hop whose fetch/polyline fails degrades to just that
// hop's straight 2-point segment — never blocks the rest of the path.
async function buildRoadPath(points: LatLng[]): Promise<LatLng[]> {
  const path: LatLng[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    try {
      const route = await mapsService.getRoute('', '', from, to);
      if (route.polyline) {
        const decoded = decodePolyline(route.polyline);
        if (decoded.length > 0) {
          path.push(...decoded);
          continue;
        }
      }
    } catch (err) {
      console.warn(`[routeOptimization] hop ${i} Direction request failed:`, err);
    }
    path.push(from, to);
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

    const matrix = await mapsService.getDistanceMatrix([originPoint, ...stopPoints], stopPoints);
    const usable = matrix
      && matrix.rows.length === stopPoints.length + 1
      && matrix.rows.every(row => row.length === stopPoints.length && row.every(cell => typeof cell.distance_m === 'number'));

    if (matrix && usable) {
      costFromStart = matrix.rows[0].map(c => c.distance_m as number);
      costMatrix = matrix.rows.slice(1).map(row => row.map(c => c.distance_m as number));
      durationFromStart = matrix.rows[0].map(c => c.duration_s);
      durationMatrix = matrix.rows.slice(1).map(row => row.map(c => c.duration_s));
      source = 'goong_matrix';
    } else {
      console.warn(`[routeOptimization] Goong matrix unusable, falling back to haversine | driver=${driverPhone} gotMatrix=${!!matrix}`);
      costFromStart = stopPoints.map(p => distanceMeters(originPoint, p));
      costMatrix = haversineMatrix(stopPoints, stopPoints);
    }

    const order = optimizeOrder(costFromStart, costMatrix);

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
