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
  // Encoded overview polyline for the whole leg (Google/Goong standard
  // encoding, precision 5) — undefined if the provider's response omitted
  // it. Decode with utils/polyline.ts's decodePolyline().
  polyline?: string;
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

export interface DistanceMatrixCell {
  distance_m: number | null;
  duration_s: number | null;
}

export interface DistanceMatrixResult {
  origins: LatLng[];
  destinations: LatLng[];
  // rows[i][j] = cell from origins[i] to destinations[j]
  rows: DistanceMatrixCell[][];
}

// Always called with real coordinates already on hand (a driver's GPS fix +
// trip pickup/dropoff coords from DynamoDB) — never free-text addresses, so
// unlike RouteProvider there's no geocoding fallback to design around.
// Returns null (not a throw) on any failure so callers can degrade to a
// haversine-only estimate instead of blocking.
export type DistanceMatrixProvider = (
  origins: LatLng[],
  destinations: LatLng[],
  apiKey: string,
) => Promise<DistanceMatrixResult | null>;
