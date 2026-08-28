export type DriverStatus = 'online' | 'offline'

export interface Driver {
  id: string
  phone: string
  name: string
  email?: string
  status: DriverStatus
  vehicle_type?: string
  vehicle_plate?: string
  vehicle_name?: string
  created_at: string
  updated_at: string
}

export interface DriverProfile {
  phone: string
  rating: number
  acceptance_rate: number
  completion_rate: number
  total_trips: number
}

export interface TodayEarnings {
  total_earnings: number
  trip_count: number
  bonus_earnings: number
  hours_online: number
  currency: string
}

export interface EarningsSummary {
  period: 'week' | 'month'
  total_earnings: number
  trip_count: number
  currency: string
}

export interface Bonus {
  description: string
  amount: string
  expires_at: string
}

export interface OptimizedRouteStop {
  trip_id: string
  kind: 'pickup' | 'dropoff'
  address: string
  customer_name: string
  lat: number
  lng: number
  // Both measured from the PREVIOUS stop in this order (or from the
  // driver's current location, for the first stop).
  distance_m: number
  eta_minutes: number
}

export interface OptimizedRoute {
  stops: OptimizedRouteStop[]
  source: 'goong_matrix' | 'haversine_fallback'
  computed_at: string
  driver_location: { lat: number; lng: number } | null
  // Road-shaped path (driver location -> stop 1 -> stop 2 -> ...) decoded
  // from each hop's real Direction polyline — draw this instead of
  // connecting stops with straight lines. Empty if no hop's polyline could
  // be fetched (fall back to straight lines between stops).
  path: { lat: number; lng: number }[]
}

export interface RouteStep {
  instruction: string
  maneuver: string
  distance_m: number
  duration_s: number
  start_location: { lat: number; lng: number }
  end_location: { lat: number; lng: number }
  polyline?: string
}

export interface NavigationRoute {
  distance_km: number | null
  eta_minutes: number | null
  traffic_note: string
  polyline: string
  steps: RouteStep[]
}

export interface DriverContext {
  driver: Driver
  driver_profile: DriverProfile
  today_earnings: TodayEarnings
  active_bonuses: Bonus[]
  upcoming_trips: (import('./trip').Trip & { estimated_fare: number })[]
  active_trips: (import('./trip').Trip & { estimated_fare: number })[]
  // "Đã hoàn thành" tab on Dashboard — completed status only, most recent first.
  completed_trips: (import('./trip').Trip & { estimated_fare: number })[]
  current_trip: (import('./trip').Trip & { estimated_fare: number }) | null
  current_location: { lat: number; lng: number; updated_at: string } | null
  // True when the assistant has a proactive nudge waiting (proximity alert,
  // next-stop suggestion) it couldn't deliver live — see
  // useAutoConnectOnNudge.ts, which opens a voice session to collect it.
  has_pending_nudge: boolean
  last_call: { call_id: string; summary?: string } | null
  // Multi-stop optimized visiting order across ALL active stops. null when
  // the driver has 0-1 active stops (nothing to order) or trips lack coords.
  optimized_route: OptimizedRoute | null
  fetched_at: string
}
