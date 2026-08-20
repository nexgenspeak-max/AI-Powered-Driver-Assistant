import { getCurrentCoords } from '../../utils/currentLocation'
import { driversService } from '../api/drivers'

// Fired the moment a driver accepts a new trip (or starts navigation, or
// flips on a proximity toggle), in parallel with whatever triggered it
// (never awaited/blocking) — so the stop-order recompute triggered
// server-side by that status change (trip-service's invalidateTripParties
// clears the cached optimized route on every active-stop-set change) has
// the freshest possible position to anchor on, instead of whatever
// useLiveDriverLocation's own slow steady-state cadence (~10min) last
// pushed. Best-effort: a failed/slow fix here just means the route
// computation falls back to that same older position, same as before this
// existed.
//
// `proximityScope`: only assistant-settings.tsx passes this (see
// updateLiveLocation's own comment) — narrows the resulting proximity check
// to just the one feature the driver just turned on, instead of also
// re-evaluating the other one.
export function pushImmediateLocation(proximityScope?: 'notify' | 'suggest'): void {
  getCurrentCoords()
    .then(({ lat, lng }) => driversService.updateLiveLocation(lat, lng, proximityScope))
    .catch(() => {})
}
