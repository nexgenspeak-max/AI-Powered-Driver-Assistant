import type { LatLng } from '../../utils/geo';

// One turn-by-turn instruction within a leg — same shape Google/Goong's
// Directions API both return (Goong mirrors Google's response format), so
// a single RouteStep type covers both providers without per-provider
// variants. `maneuver` is the provider's own vocabulary (e.g. "left",
// "right", "straight", "uturn", "roundabout-left", or "" when the provider
// doesn't classify a step) — callers map it to an icon, unknown values
// should fall back to a generic arrow rather than erroring.
export interface RouteStep {
  instruction: string;
  maneuver: string;
  distance_m: number;
  duration_s: number;
  start_location: LatLng;
  end_location: LatLng;
  // Encoded polyline for just this one step — undefined if the provider's
  // response omitted it for this step.
  polyline?: string;
}

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
  // Turn-by-turn steps for the leg, in order — undefined if the provider's
  // response omitted them (older responses / a provider that doesn't
  // support it). Used by the driver-app's turn-by-turn navigation HUD; NOT
  // fetched/needed for routeOptimizationService.ts's own getRoute() calls
  // (those only ever use `polyline`), so leaving this undefined there costs
  // nothing.
  steps?: RouteStep[];
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
