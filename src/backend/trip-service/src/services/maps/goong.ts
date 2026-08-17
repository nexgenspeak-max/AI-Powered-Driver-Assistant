import type { RouteInfo, DistanceMatrixResult } from './types';
import type { LatLng } from '../../utils/geo';

const GEOCODE_URL = 'https://rsapi.goong.io/geocode';
const DIRECTION_URL = 'https://rsapi.goong.io/Direction';
const DISTANCE_MATRIX_URL = 'https://rsapi.goong.io/DistanceMatrix';

async function geocode(address: string, apiKey: string): Promise<string | null> {
  const params = new URLSearchParams({ address, api_key: apiKey });
  const resp = await fetch(`${GEOCODE_URL}?${params}`, { signal: AbortSignal.timeout(5000) });
  const data = await resp.json() as Record<string, unknown>;

  if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) return null;

  const location = (data.results as any[])[0]?.geometry?.location;
  if (!location) return null;
  return `${location.lat},${location.lng}`;
}

// Goong Direction requires lat,lng — unlike Google it does not accept free-text addresses,
// so this geocodes both ends first, unless the caller already resolved
// precise coordinates (see RouteProvider's comment in ./types.ts).
export async function getRoute(
  pickup: string,
  dropoff: string,
  apiKey: string,
  pickupCoords?: LatLng,
  dropoffCoords?: LatLng,
): Promise<Partial<RouteInfo>> {
  if (!apiKey) return {};

  try {
    const [origin, destination] = await Promise.all([
      pickupCoords ? `${pickupCoords.lat},${pickupCoords.lng}` : geocode(pickup, apiKey),
      dropoffCoords ? `${dropoffCoords.lat},${dropoffCoords.lng}` : geocode(dropoff, apiKey),
    ]);
    if (!origin || !destination) return {};

    const params = new URLSearchParams({ origin, destination, vehicle: 'car', api_key: apiKey });
    const resp = await fetch(`${DIRECTION_URL}?${params}`, { signal: AbortSignal.timeout(5000) });
    const data = await resp.json() as Record<string, unknown>;

    if (!Array.isArray(data.routes) || data.routes.length === 0) {
      console.warn(`Goong Direction API status: ${data.status ?? 'unknown'}`);
      return {};
    }

    const route = (data.routes as any[])[0];
    const leg = route.legs[0];
    const distanceKm = leg.distance.value / 1000;
    const trafficLeg = leg.duration_in_traffic;
    const etaMinutes = Math.floor((trafficLeg ?? leg.duration).value / 60);

    // Prefer the response's own start/end_location (road-snapped); fall back
    // to the geocoded origin/destination we already resolved above if Goong
    // omits either.
    const [originLat, originLng] = origin.split(',').map(Number);
    const [destLat, destLng] = destination.split(',').map(Number);
    const pickupLat = leg.start_location?.lat ?? originLat;
    const pickupLng = leg.start_location?.lng ?? originLng;
    const dropoffLat = leg.end_location?.lat ?? destLat;
    const dropoffLng = leg.end_location?.lng ?? destLng;

    let trafficNote = '';
    if (trafficLeg) {
      const normalMinutes = Math.floor(leg.duration.value / 60);
      const delay = etaMinutes - normalMinutes;
      if (delay >= 10) trafficNote = `Kẹt xe nặng, thêm khoảng ${delay} phút so với bình thường`;
      else if (delay >= 4) trafficNote = `Giao thông chậm, thêm khoảng ${delay} phút`;
      else trafficNote = 'Giao thông thông thoáng';
    }

    return {
      distance_km: Math.round(distanceKm * 10) / 10,
      eta_minutes: etaMinutes,
      traffic_note: trafficNote,
      summary: route.summary ?? '',
      pickup_lat: pickupLat,
      pickup_lng: pickupLng,
      dropoff_lat: dropoffLat,
      dropoff_lng: dropoffLng,
      polyline: route.overview_polyline?.points,
    };
  } catch {
    console.warn('Goong Maps request failed');
    return {};
  }
}

// Real-coordinate-only (never free-text) — used by routeOptimizationService.ts
// to build a full origins×destinations cost matrix in one call, instead of
// N*(N-1) separate getRoute() pairs. No documented limit on the number of
// origins/destinations in Goong's docs — callers must treat a null return
// (any failure, including a possible size-limit rejection) as "fall back to
// haversine", never as fatal.
export async function getDistanceMatrix(
  origins: LatLng[],
  destinations: LatLng[],
  apiKey: string,
): Promise<DistanceMatrixResult | null> {
  if (!apiKey || origins.length === 0 || destinations.length === 0) return null;

  console.log(`[goong] DistanceMatrix request | origins=${origins.length} destinations=${destinations.length}`);

  try {
    const params = new URLSearchParams({
      origins: origins.map(o => `${o.lat},${o.lng}`).join('|'),
      destinations: destinations.map(d => `${d.lat},${d.lng}`).join('|'),
      vehicle: 'car',
      api_key: apiKey,
    });
    const resp = await fetch(`${DISTANCE_MATRIX_URL}?${params}`, { signal: AbortSignal.timeout(5000) });
    const data = await resp.json() as Record<string, unknown>;

    // Unlike Goong's /Direction, /DistanceMatrix has no top-level `status`
    // field — only a per-element one (checked below when reading each
    // cell) — so the only thing to validate here is the response shape.
    if (!Array.isArray(data.rows)) {
      console.warn('[goong] DistanceMatrix: unexpected response shape', data);
      return null;
    }

    const rows = (data.rows as any[]).map(row =>
      ((row.elements ?? []) as any[]).map(el => ({
        distance_m: el.status === 'OK' ? (el.distance?.value ?? null) : null,
        duration_s: el.status === 'OK' ? ((el.duration_in_traffic ?? el.duration)?.value ?? null) : null,
      })),
    );

    const cellCount = rows.reduce((n, row) => n + row.length, 0);
    const okCount = rows.reduce((n, row) => n + row.filter(c => c.distance_m !== null).length, 0);
    console.log(`[goong] DistanceMatrix response | cells=${cellCount} ok=${okCount}`);

    return { origins, destinations, rows };
  } catch (err) {
    console.warn('[goong] DistanceMatrix request failed:', err);
    return null;
  }
}
