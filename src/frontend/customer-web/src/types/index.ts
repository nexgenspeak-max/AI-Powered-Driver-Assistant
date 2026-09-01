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
  note?: string
  route_summary: string
  room_name?: string
  created_at: string
  updated_at: string
}

export interface CreateTripPayload {
  driver_phone?: string
  customer_name: string
  customer_phone?: string
  pickup_address: string
  dropoff_address: string
  pickup_lat?: number
  pickup_lng?: number
  dropoff_lat?: number
  dropoff_lng?: number
  pickup_time?: string
  note?: string
  booked_via?: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  status: 'online' | 'offline'
  created_at: string
  updated_at: string
}

export interface Driver {
  id: string
  phone: string
  name: string
  status: 'online' | 'offline'
  vehicle_type?: string
  vehicle_plate?: string
  vehicle_name?: string
}

export interface CustomerContext {
  customer_phone: string
  trips: Trip[]
  active_trip: Trip | null
  active_trips: Trip[]
  driver_location: { lat: number; lng: number; updated_at: string } | null
  fetched_at: string
}
