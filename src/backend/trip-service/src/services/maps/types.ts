import type { LatLng } from '../../utils/geo';

export interface RouteInfo {
  distance_km: number;
  eta_minutes: number;
  traffic_note: string;
  summary: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
}

// `pickupCoords`/`dropoffCoords` are optional — when the caller already has
// precise coordinates (e.g. the customer tapped a Goong Place Autocomplete
// suggestion or we used their GPS fix), providers use those directly instead
// of re-geocoding the free-text address, which is both more accurate (no
// risk of the text geocoding to a different nearby match) and saves a
// round-trip. Callers that only have address text (voice-agent, admin) are
// unaffected — this falls back to the original text-geocoding behavior.
export type RouteProvider = (
  pickup: string,
  dropoff: string,
  apiKey: string,
  pickupCoords?: LatLng,
  dropoffCoords?: LatLng,
) => Promise<Partial<RouteInfo>>;
