import { useEffect, useRef, useState } from 'react'
import * as Location from 'expo-location'
import { shouldPush } from '../lib/pushCadence'
import type { LatLng } from '../../../utils/geo'
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

// Cadence of the backend push is distance-aware (lib/pushCadence.ts): the
// cheap ~10-min ping while idle, every 60 s / 500 m with an active trip, and
// every 15 s / 150 m inside 3 km of a stop — the backend's pickup-approach
// call (default 1 km) is evaluated on each push, so the old flat 10 minutes
// let a moving driver skip right past the radius.
const WALL_CLOCK_TICK_MS = 15 * 1000
const STALE_FIX_MS = 10 * 1000

// lastPushedAtRef starts at 0, so the very first push below (as soon as
// `enabled` is true and a fix has landed — i.e. right as the app opens with
// the driver already online, or the moment they go online) always fires
// immediately regardless of this throttle: `now - 0` is always way past
// the cadence in lib/pushCadence.ts. That's deliberate — the whole point of this
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
// driverLiveLocationKey fresh. Pushes via updateLiveLocation
// (POST /me/location/live), which also runs the proximity checks.
// `enabled` gates the push (not the local stream, which the map always
// needs) to match useProximityTracking's online-only pinging. `stops` are
// the active trips' next points (pickup, or dropoff once picked up).
export function useLiveDriverLocation(enabled: boolean, stops: LatLng[] = []): LiveCoords | null {
  const [coords, setCoords] = useState<LiveCoords | null>(null)
  const enabledRef = useRef(enabled)
  const coordsRef = useRef<LiveCoords | null>(null)
  const lastPushedAtRef = useRef(0)
  const lastPushedPointRef = useRef<LatLng | null>(null)
  const stopsRef = useRef<LatLng[]>(stops)
  stopsRef.current = stops

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  // Shared by both trigger paths below — the GPS-movement callback AND the
  // stationary-safety timer — so whichever fires first for a given interval
  // window "wins" and the other is naturally a no-op via the same throttle.
  const pushIfDue = () => {
    if (!enabledRef.current || !coordsRef.current) return
    const now = Date.now()
    const here = { lat: coordsRef.current.lat, lng: coordsRef.current.lng }
    if (!shouldPush({ now, lastPushAt: lastPushedAtRef.current, here, lastPushed: lastPushedPointRef.current, stops: stopsRef.current })) return
    lastPushedAtRef.current = now
    lastPushedPointRef.current = here
    const { lat, lng } = here
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
      //
      // The watch stream itself can also stall: iOS pauses a watch that
      // started while the device was stationary and does not always resume
      // it once moving (simulator 2026-10-18: the background task saw the
      // driver close from 1346 m to 1131 m while the foreground stream sat
      // on the starting fix, so the map marker and the pickup check froze).
      // Each tick, a fix older than STALE_FIX_MS is refreshed directly.
      intervalId = setInterval(() => {
        const last = coordsRef.current
        if (!last || Date.now() - last.updatedAt > STALE_FIX_MS) {
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
            .then(loc => {
              if (cancelled) return
              const { latitude: lat, longitude: lng, heading } = loc.coords
              const next = { lat, lng, updatedAt: loc.timestamp, heading: heading != null && heading >= 0 ? heading : null }
              setCoords(next)
              coordsRef.current = next
              pushIfDue()
            })
            .catch(() => pushIfDue())
          return
        }
        pushIfDue()
      }, WALL_CLOCK_TICK_MS)
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
