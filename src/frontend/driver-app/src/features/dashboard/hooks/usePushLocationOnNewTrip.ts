import { useEffect, useRef } from 'react'
import { useDriverContext } from './useDriverContext'
import { pushImmediateLocation } from '../../../services/location/pushImmediateLocation'

// Covers trip confirmations that DON'T go through TripCard.tsx/
// TripOfferSheet.tsx's own pushImmediateLocation() call (e.g. voice-agent's
// confirm_trip tool, which updates the trip status straight against
// trip-service and has no access to the phone's GPS to push a fresh fix
// itself) — those two call sites already fire on tap for near-zero latency;
// this is the catch-all that notices the resulting state change instead,
// via active_trips (confirmed/arrived_pickup/picked_up) on the same 5s poll
// useDriverContext already runs. Up to ~5s slower than the tap-triggered
// path, but still far fresher than waiting on useLiveDriverLocation's own
// slow steady-state cadence (~10min) — and harmless to fire an extra time
// for the tap path too (pushImmediateLocation is idempotent/cheap, just a
// cache write).
export function usePushLocationOnNewTrip(): void {
  const { data: context } = useDriverContext()
  const knownTripIdsRef = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (!context?.active_trips) return
    const currentIds = context.active_trips.map(t => t.trip_id)

    // First data ever seen (app just launched, possibly mid-trip already) —
    // seed the known set instead of treating every already-active trip as
    // "newly confirmed".
    if (knownTripIdsRef.current === null) {
      knownTripIdsRef.current = new Set(currentIds)
      return
    }

    const known = knownTripIdsRef.current
    const hasNewTrip = currentIds.some(id => !known.has(id))
    for (const id of currentIds) known.add(id)

    if (hasNewTrip) pushImmediateLocation()
  }, [context?.active_trips])
}
