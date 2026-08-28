import { useEffect, useRef, useState } from 'react'
import * as Location from 'expo-location'
import { driversService } from '../../../services/api/drivers'

export interface LiveCoords {
  lat: number
  lng: number
  updatedAt: number
  // Degrees from true north, direction of travel — null when the OS can't
  // determine it (stationary, no compass/GPS-course fix yet). Used by the
  // turn-by-turn navigation HUD to rotate the map camera to heading-up.
  heading: number | null
}

// Steady-state throttle for the backend push below, once the app has
// already sent its first fix — matches locationTracking.ts's own ~10-min
// cadence by design, now that trip.ts/drivers.ts push fresh GPS on the
// events that actually need it (trip confirmed, arrived_pickup, picked_up,
// completed — see useDispatchSocket.ts's 'trip_confirmed'/'schedule_updated'
// handling and pushImmediateLocation.ts). Blanket 30s polling isn't needed
// on top of those targeted pushes, and 10 min keeps this endpoint's load in
// line with the original background task it complements.
const BACKEND_PUSH_INTERVAL_MS = 10 * 60 * 1000

// lastPushedAtRef starts at 0, so the very first push below (as soon as
// `enabled` is true and a fix has landed — i.e. right as the app opens with
// the driver already online, or the moment they go online) always fires
// immediately regardless of this throttle: `now - 0` is always way past
// BACKEND_PUSH_INTERVAL_MS. That's deliberate — the whole point of this
// hook is making sure driverLiveLocationKey is never empty (hasLocation=
// false) right as the app loads/reloads the driver's schedule.

// Foreground-only, high-frequency local GPS stream that drives the map
// marker directly off the phone's own GPS — separate from
// dashboard/services/locationTracking.ts's background task, which pings
// POST /me/location every ~10 min (and only when background-location
// permission was granted; if it wasn't, that task never fires at all — see
// routeOptimizationService.ts's hasLocation=false fallback). This hook only
// needs foreground permission, which is already required for the map to
// work, so it's a far more reliable path to keep the backend's
// driverLiveLocationKey fresh — throttled to BACKEND_PUSH_INTERVAL_MS so it
// doesn't spam the API on every 3s/5m local tick. Pushes via
// updateLiveLocation (POST /me/location/live), NOT updateLocation — that
// endpoint also runs a per-trip proximity-notification loop meant to stay
// on the slow ~10-min cadence, so this hook intentionally hits the
// side-effect-free counterpart instead of piling 20x more calls onto it.
// `enabled` gates the push (not the local stream, which the map always
// needs) to match useProximityTracking's online-only pinging.
export function useLiveDriverLocation(enabled: boolean): LiveCoords | null {
  const [coords, setCoords] = useState<LiveCoords | null>(null)
  const enabledRef = useRef(enabled)
  const coordsRef = useRef<LiveCoords | null>(null)
  const lastPushedAtRef = useRef(0)

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  // Shared by both trigger paths below — the GPS-movement callback AND the
  // stationary-safety timer — so whichever fires first for a given interval
  // window "wins" and the other is naturally a no-op via the same throttle.
  const pushIfDue = () => {
    if (!enabledRef.current || !coordsRef.current) return
    const now = Date.now()
    if (now - lastPushedAtRef.current < BACKEND_PUSH_INTERVAL_MS) return
    lastPushedAtRef.current = now
    const { lat, lng } = coordsRef.current
    driversService.updateLiveLocation(lat, lng).catch(() => {})
  }

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null
    let intervalId: ReturnType<typeof setInterval> | null = null
    let cancelled = false

    ;(async () => {
      const fg = await Location.getForegroundPermissionsAsync()
      const granted = fg.granted ? true : (await Location.requestForegroundPermissionsAsync()).granted
      if (!granted || cancelled) return

      // Distance-gated as well as time-gated so a parked/idle driver isn't
      // pushing marker re-renders (and camera re-centers) every 3s for a
      // GPS reading that hasn't actually moved.
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 3000, distanceInterval: 5 },
        loc => {
          if (cancelled) return
          const { latitude: lat, longitude: lng, heading } = loc.coords
          const next = { lat, lng, updatedAt: loc.timestamp, heading: heading != null && heading >= 0 ? heading : null }
          setCoords(next)
          coordsRef.current = next
          pushIfDue()
        },
      )

      // watchPositionAsync's own callback is movement-gated
      // (distanceInterval: 5) — on a driver who's stopped (parked, or the
      // phone just sitting still while testing) it can go a very long time,
      // sometimes indefinitely on iOS, without firing again at all, which
      // silently starved the periodic backend push entirely: no callback,
      // no push, and eventually driverLiveLocationKey's own TTL (20min)
      // expires with nothing to refresh it. This timer re-checks on a flat
      // wall-clock cadence regardless of movement, using whatever fix is
      // already in coordsRef, so a stationary driver's location keeps
      // getting refreshed instead of quietly going stale.
      intervalId = setInterval(pushIfDue, BACKEND_PUSH_INTERVAL_MS)
    })()

    return () => {
      cancelled = true
      subscription?.remove()
      if (intervalId) clearInterval(intervalId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return coords
}
