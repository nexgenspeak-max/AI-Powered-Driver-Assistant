import { useEffect, useRef } from 'react'
import { startTracking, stopTracking, setLocationUpdateHandler } from '../services/locationTracking'
import { driversService } from '../../../services/api/drivers'

// Wired once at module load — the background task's callback always
// forwards to trip-service. Swallowed errors: a network hiccup shouldn't
// crash the tracking loop, and there's no UI here to surface it to (the
// driver isn't looking at this screen while driving).
setLocationUpdateHandler((coords) => {
  driversService.updateLocation(coords.lat, coords.lng).catch(() => {})
})

// Starts/stops background GPS tracking (~every 10 min, see
// locationTracking.ts) to match the driver's online/offline toggle — not
// tied to any specific trip status anymore. Runs the whole time the driver
// is online, including while idle waiting for a trip, so the "next stop
// suggestion" and "ask before calling the customer" features always have a
// reasonably fresh position to work from.
export function useProximityTracking(isOnline: boolean): void {
  const tracked = useRef(false)

  useEffect(() => {
    if (!isOnline) {
      if (tracked.current) {
        tracked.current = false
        stopTracking()
      }
      return
    }

    if (tracked.current) return
    tracked.current = true
    startTracking()
  }, [isOnline])
}
