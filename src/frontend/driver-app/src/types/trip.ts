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
  note?: string
  has_bulky_goods?: boolean
  with_children?: boolean
  room_name: string
  created_at: string
  updated_at: string
}

/** Driver walk-up / street-hail create payload (`booked_via: driver`). */
export interface CreateWalkupTripInput {
  customer_phone: string
  pickup_address: string
  dropoff_address: string
  customer_name?: string
  note?: string
  has_bulky_goods?: boolean
  with_children?: boolean
}
