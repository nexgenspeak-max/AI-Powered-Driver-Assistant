import { useEffect, useRef } from 'react'
import {
  startIdleTracking,
  stopIdleTracking,
  setIdleLocationUpdateHandler,
} from '../services/idleLocationTracking'
import { driversService } from '../../../services/api/drivers'

// Wired once at module load, same pattern as useProximityTracking.ts's
// setLocationUpdateHandler — errors swallowed, no UI here to surface them to.
setIdleLocationUpdateHandler((coords) => {
  driversService.updateLocation(coords.lat, coords.lng).catch(() => {})
})

// Starts/stops the idle GPS task to match the driver's Online switch
// (dashboard.tsx) — independent of useProximityTracking, which only cares
// about a trip already in progress.
export function useIdleLocationTracking(isOnline: boolean): void {
  const wasOnline = useRef(false)

  useEffect(() => {
    if (isOnline === wasOnline.current) return
    wasOnline.current = isOnline

    if (isOnline) startIdleTracking()
    else stopIdleTracking()
  }, [isOnline])
}
