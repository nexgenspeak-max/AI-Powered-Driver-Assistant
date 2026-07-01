const DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';

export interface RouteInfo {
  distance_km: number;
  eta_minutes: number;
  traffic_note: string;
  summary: string;
}

export async function getRoute(pickup: string, dropoff: string, apiKey: string): Promise<Partial<RouteInfo>> {
  if (!apiKey) return {};

  const params = new URLSearchParams({
    origin: pickup,
    destination: dropoff,
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
    };
  } catch {
    console.warn('Google Maps request failed');
    return {};
  }
}
