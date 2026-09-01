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

export type TripStatus =
  | 'pending' | 'notified' | 'calling'
  | 'confirmed' | 'rejected' | 'no_answer'
  | 'arrived_pickup' | 'picked_up' | 'completed'
  | 'cancelled' | 'cancelled_by_driver' | 'no_show'

export interface Trip {
  trip_id: string
  status: TripStatus
  driver_phone: string
  customer_name: string
  customer_phone: string
  pickup_address: string
  dropoff_address: string
  pickup_lat?: number
  pickup_lng?: number
  dropoff_lat?: number
  dropoff_lng?: number
  pickup_time: string
  booked_via: string
  distance_km: number
  eta_minutes: number
  traffic_note: string
  route_summary: string
  room_name?: string
  created_at: string
  updated_at: string
}

export type TripWithFare = Trip & { estimated_fare?: number }

export interface DriverContext {
  driver: Driver
  driver_profile: DriverProfile
  today_earnings: TodayEarnings
  active_bonuses: Bonus[]
  upcoming_trips: TripWithFare[]
  active_trips: TripWithFare[]
  completed_trips: TripWithFare[]
  current_trip: TripWithFare | null
  current_location: { lat: number; lng: number; updated_at: string } | null
  has_pending_nudge: boolean
  last_call: { call_id: string; summary?: string } | null
  optimized_route: unknown | null
  fetched_at: string
}

export type DeliveryOrderStatus =
  | 'pending' | 'picked_up' | 'delivering' | 'delivered' | 'redelivery' | 'returned'

export interface DeliveryOrder {
  order_id: string
  driver_phone: string
  status: DeliveryOrderStatus
  sender_phone: string
  sender_address?: string
  recipient_name?: string
  recipient_phone: string
  recipient_address: string
  note?: string
  source: 'ai_scan' | 'manual'
  created_at: string
  updated_at: string
}
