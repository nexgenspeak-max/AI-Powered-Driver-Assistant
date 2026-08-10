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

export interface DriverContext {
  driver: Driver
  driver_profile: DriverProfile
  today_earnings: TodayEarnings
  active_bonuses: Bonus[]
  upcoming_trips: (import('./trip').Trip & { estimated_fare: number })[]
  active_trips: (import('./trip').Trip & { estimated_fare: number })[]
  current_trip: (import('./trip').Trip & { estimated_fare: number }) | null
  current_location: { lat: number; lng: number; updated_at: string } | null
  // True when the assistant has a proactive nudge waiting (proximity alert,
  // next-stop suggestion) it couldn't deliver live — see
  // useAutoConnectOnNudge.ts, which opens a voice session to collect it.
  has_pending_nudge: boolean
  last_call: { call_id: string; summary?: string } | null
  fetched_at: string
}
