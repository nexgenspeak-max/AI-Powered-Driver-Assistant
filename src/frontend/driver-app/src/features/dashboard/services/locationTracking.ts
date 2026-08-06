import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'

// Defined at module scope (not inside a component) so Expo/TaskManager can
// re-register it on a headless relaunch — same requirement documented in
// Location.startLocationUpdatesAsync's own docs.
const LOCATION_TASK_NAME = 'driver-proximity-location-task'

export interface DriverCoords {
  lat: number
  lng: number
}

type LocationUpdateHandler = (tripId: string, coords: DriverCoords) => void

// Default is a visible no-op (not a silent swallow) so step-2 manual device
// testing has something to observe before step 4 wires the real API call in
// via setLocationUpdateHandler().
let onUpdate: LocationUpdateHandler = (tripId, coords) => {
  console.log(`[locationTracking] ${tripId} ->`, coords)
}
let activeTripId: string | null = null

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('[locationTracking] task error', error.message)
    return
  }
  if (!activeTripId) return

  const { locations } = (data ?? {}) as { locations?: Location.LocationObject[] }
  const last = locations?.[locations.length - 1]
  if (!last) return

  onUpdate(activeTripId, { lat: last.coords.latitude, lng: last.coords.longitude })
})

export function setLocationUpdateHandler(handler: LocationUpdateHandler): void {
  onUpdate = handler
}

// Foreground permission must be requested (and granted) before background
// permission can even be asked for — enforced by both OSes, not just a style
// choice. Mirrors the check-then-request shape of contactsSearch.ts's
// ensurePermission().
async function ensurePermission(): Promise<boolean> {
  const fg = await Location.getForegroundPermissionsAsync()
  const fgGranted = fg.granted ? true : (await Location.requestForegroundPermissionsAsync()).granted
  if (!fgGranted) return false

  const bg = await Location.getBackgroundPermissionsAsync()
  return bg.granted ? true : (await Location.requestBackgroundPermissionsAsync()).granted
}

// Starts (or re-targets) background GPS tracking for the given trip. Safe to
// call repeatedly — a no-op if already tracking the same trip.
export async function startTracking(tripId: string): Promise<boolean> {
  const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
  if (alreadyRunning && activeTripId === tripId) return true

  const granted = await ensurePermission()
  if (!granted) return false

  activeTripId = tripId

  if (!alreadyRunning) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 15000,
      distanceInterval: 50,
      foregroundService: {
        notificationTitle: 'Czen Driver đang theo dõi vị trí',
        notificationBody: 'Giúp báo cho khách hàng khi bạn sắp đến điểm đón.',
      },
    })
  }

  return true
}

export async function stopTracking(): Promise<void> {
  activeTripId = null
  const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
  if (running) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
  }
}
