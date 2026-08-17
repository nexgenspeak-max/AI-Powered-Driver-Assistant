import type { RouteInfo, DistanceMatrixResult } from './types';
import type { LatLng } from '../../utils/geo';

const DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';
const DISTANCE_MATRIX_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';

export async function getRoute(
  pickup: string,
  dropoff: string,
  apiKey: string,
  pickupCoords?: LatLng,
  dropoffCoords?: LatLng,
): Promise<Partial<RouteInfo>> {
  if (!apiKey) return {};

  // Directions API accepts "lat,lng" directly for origin/destination —
  // unlike Goong there's no separate geocode step either way, so precise
  // coordinates (when the caller has them) just replace the address string.
  const params = new URLSearchParams({
    origin: pickupCoords ? `${pickupCoords.lat},${pickupCoords.lng}` : pickup,
    destination: dropoffCoords ? `${dropoffCoords.lat},${dropoffCoords.lng}` : dropoff,
    language: 'vi',
    region: 'vn',
    departure_time: 'now',
    traffic_model: 'best_guess',
    key: apiKey,
  });

  try {
    const resp = await fetch(`${DIRECTIONS_URL}?${params}`, { signal: AbortSignal.timeout(5000) });
    const data = await resp.json() as Record<string, unknown>;

    if (data.status !== 'OK' || !Array.isArray(data.routes) || data.routes.length === 0) {
      console.warn(`Maps API status: ${data.status}`);
      return {};
    }

    const route = (data.routes as any[])[0];
    const leg = route.legs[0];
    const distanceKm = leg.distance.value / 1000;
    const etaMinutes = Math.floor((leg.duration_in_traffic ?? leg.duration).value / 60);
    const normalMinutes = Math.floor(leg.duration.value / 60);
    const delay = etaMinutes - normalMinutes;

    let trafficNote: string;
    if (delay >= 10) trafficNote = `Kẹt xe nặng, thêm khoảng ${delay} phút so với bình thường`;
    else if (delay >= 4) trafficNote = `Giao thông chậm, thêm khoảng ${delay} phút`;
    else trafficNote = 'Giao thông thông thoáng';

    return {
      distance_km: Math.round(distanceKm * 10) / 10,
      eta_minutes: etaMinutes,
      traffic_note: trafficNote,
      summary: route.summary ?? '',
      pickup_lat: leg.start_location?.lat,
      pickup_lng: leg.start_location?.lng,
      dropoff_lat: leg.end_location?.lat,
      dropoff_lng: leg.end_location?.lng,
      polyline: route.overview_polyline?.points,
    };
  } catch {
    console.warn('Google Maps request failed');
    return {};
  }
}

// Mirrors goong.ts's getDistanceMatrix — kept in sync for whoever flips
// MAPS_PROVIDER=google, even though only goong is configured today.
export async function getDistanceMatrix(
  origins: LatLng[],
  destinations: LatLng[],
  apiKey: string,
): Promise<DistanceMatrixResult | null> {
  if (!apiKey || origins.length === 0 || destinations.length === 0) return null;

  try {
    const params = new URLSearchParams({
      origins: origins.map(o => `${o.lat},${o.lng}`).join('|'),
      destinations: destinations.map(d => `${d.lat},${d.lng}`).join('|'),
      departure_time: 'now',
      key: apiKey,
    });
    const resp = await fetch(`${DISTANCE_MATRIX_URL}?${params}`, { signal: AbortSignal.timeout(5000) });
    const data = await resp.json() as Record<string, unknown>;

    if (data.status !== 'OK' || !Array.isArray(data.rows)) {
      console.warn(`Google DistanceMatrix status: ${data.status}`);
      return null;
    }

    const rows = (data.rows as any[]).map(row =>
      ((row.elements ?? []) as any[]).map(el => ({
        distance_m: el.status === 'OK' ? (el.distance?.value ?? null) : null,
        duration_s: el.status === 'OK' ? ((el.duration_in_traffic ?? el.duration)?.value ?? null) : null,
      })),
    );

    return { origins, destinations, rows };
  } catch {
    console.warn('Google DistanceMatrix request failed');
    return null;
  }
}
