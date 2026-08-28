import type { Trip } from './trip'

export interface CustomerContext {
  customer_phone: string
  // Full trip history this account has ever made (up to the backend's own
  // cap), newest first — used for the trip-history screen. Home's map only
  // ever draws from active_trips below.
  trips: Trip[]
  // First non-terminal trip, if any — kept for parity with the shape
  // voice-agent's backend_api.get_customer_context already reads.
  active_trip: Trip | null
  // Every trip that isn't completed/rejected/no_answer/cancelled/
  // cancelled_by_driver — same "chuyến đang có" idea as driver-app's own
  // active_trips, just from the customer's side. Home's map draws one
  // pickup + one dropoff pin per entry here.
  active_trips: Trip[]
  // Last known position of the driver on whichever active trip is actually
  // confirmed/en route (confirmed/arrived_pickup/picked_up) — null while no
  // active trip has a driver en route yet, or that driver hasn't reported a
  // position.
  driver_location: { lat: number; lng: number; updated_at: string } | null
  fetched_at: string
}
