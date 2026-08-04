import type { RouteInfo } from './types';
import type { LatLng } from '../../utils/geo';

const GEOCODE_URL = 'https://rsapi.goong.io/geocode';
const DIRECTION_URL = 'https://rsapi.goong.io/Direction';

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
    };
  } catch {
    console.warn('Goong Maps request failed');
    return {};
  }
}
