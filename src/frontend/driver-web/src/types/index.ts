export type DriverStatus = 'online' | 'offline'

export interface Driver {
  id: string
  phone: string
  name: string
  status: DriverStatus
  vehicle_type?: string
  vehicle_plate?: string
  vehicle_name?: string
  created_at: string
  updated_at: string
}

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
  distance_km: number
  eta_minutes: number
  traffic_note: string
  route_summary: string
  created_at: string
  updated_at: string
}
