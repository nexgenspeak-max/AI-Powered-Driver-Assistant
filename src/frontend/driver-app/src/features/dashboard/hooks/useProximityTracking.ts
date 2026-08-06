import { useEffect, useRef } from 'react'
import { startTracking, stopTracking, setLocationUpdateHandler } from '../services/locationTracking'
import { tripsService } from '../../../services/api/trips'
import type { Trip } from '../../../types'

// Wired once at module load — the background task's callback always
// forwards to trip-service. Swallowed errors: a network hiccup shouldn't
// crash the tracking loop, and there's no UI here to surface it to (the
// driver isn't looking at this screen while driving).
setLocationUpdateHandler((tripId, coords) => {
  tripsService.updateLocation(tripId, coords.lat, coords.lng).catch(() => {})
})

// Starts/stops background GPS tracking to match whichever trip is currently
// `confirmed` (driving to pickup) or `picked_up` (driving the passenger to
// dropoff) — `picked_up` was added for the driver auto-match/ride-pool
// feature, which needs a busy driver's live position + their trip's
// dropoff to judge whether a new pickup is roughly on the way. Takes the
// same `active_trips` data ActiveTripCard already renders from (via
// useDriverContext()), so no extra fetching.
//
// Only tracks one trip at a time (`find` takes the first match) — a driver
// holding two simultaneously busy trips (e.g. confirmed for a next pickup
// while still finishing a `picked_up` one) is an existing edge case this
// doesn't attempt to solve.
const TRACKED_STATUSES = new Set(['confirmed', 'picked_up'])

export function useProximityTracking(activeTrips: Trip[]): void {
  const trackedTripId = useRef<string | null>(null)

  useEffect(() => {
    const trackedTrip = activeTrips.find((t) => TRACKED_STATUSES.has(t.status))

    if (!trackedTrip) {
      if (trackedTripId.current) {
        trackedTripId.current = null
        stopTracking()
      }
      return
    }

    if (trackedTripId.current === trackedTrip.trip_id) return
    trackedTripId.current = trackedTrip.trip_id
    startTracking(trackedTrip.trip_id)
  }, [activeTrips])
}
