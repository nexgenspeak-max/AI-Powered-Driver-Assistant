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

export type RouteProvider = (pickup: string, dropoff: string, apiKey: string) => Promise<Partial<RouteInfo>>;
