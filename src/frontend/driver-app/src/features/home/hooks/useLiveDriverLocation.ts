import { useEffect, useState } from 'react'
import * as Location from 'expo-location'

export interface LiveCoords {
  lat: number
  lng: number
  updatedAt: number
}

// Foreground-only, high-frequency local GPS stream that drives the map
// marker directly off the phone's own GPS — separate from
// dashboard/services/locationTracking.ts's background task, which still
// pings the backend every ~10 min for proximity/business-logic checks
// (customer notifications, next-stop suggestion, etc.) only. The map itself
// should never have to wait on that network round trip (or the backend's
// own driverContext cache) to reflect where the driver actually is right
// now — this hook never touches the backend at all.
export function useLiveDriverLocation(): LiveCoords | null {
  const [coords, setCoords] = useState<LiveCoords | null>(null)

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null
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
          setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude, updatedAt: loc.timestamp })
        },
      )
    })()

    return () => {
      cancelled = true
      subscription?.remove()
    }
  }, [])

  return coords
}
