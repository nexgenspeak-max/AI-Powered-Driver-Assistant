export type TripStatus =
  | 'pending' | 'notified' | 'calling'
  | 'confirmed' | 'rejected' | 'no_answer' | 'completed'

export interface Trip {
  trip_id: string
  status: TripStatus
  driver_phone: string
  customer_name: string
  customer_phone: string
  pickup_address: string
  dropoff_address: string
  pickup_time: string
  booked_via: string
  distance_km: number
  eta_minutes: number
  traffic_note: string
  route_summary: string
  room_name: string
  created_at: string
  updated_at: string
}

export interface CreateTripPayload {
  driver_phone: string
  customer_name: string
  customer_phone?: string
  pickup_address: string
  dropoff_address: string
  pickup_time?: string
  booked_via?: string
}
