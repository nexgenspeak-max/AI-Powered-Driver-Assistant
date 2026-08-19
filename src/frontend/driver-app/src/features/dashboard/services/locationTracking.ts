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

type LocationUpdateHandler = (coords: DriverCoords) => void

// Default is a visible no-op (not a silent swallow) so manual device testing
// has something to observe before setLocationUpdateHandler() wires the real
// API call in.
let onUpdate: LocationUpdateHandler = (coords) => {
  console.log('[locationTracking] ->', coords)
}
let tracking = false

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('[locationTracking] task error', error.message)
    return
  }
  if (!tracking) return

  const { locations } = (data ?? {}) as { locations?: Location.LocationObject[] }
  const last = locations?.[locations.length - 1]
  if (!last) return

  onUpdate({ lat: last.coords.latitude, lng: last.coords.longitude })
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

// Starts (or keeps running) background GPS tracking for as long as the
// driver is online — NOT tied to any specific trip (unlike the old
// per-trip version of this module). Safe to call repeatedly.
export async function startTracking(): Promise<boolean> {
  const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)

  if (!alreadyRunning) {
    const granted = await ensurePermission()
    if (!granted) return false
  }

  tracking = true

  // Fires one immediate fix on every call (including the "already running"
  // path below) — without this, going online, or reopening the app while
  // the background task was still registered from an earlier session, left
  // the driver absent from the map for up to `timeInterval` (10 min), since
  // startLocationUpdatesAsync's first callback only lands after that much
  // time or that much movement. Best-effort: a failure here (e.g. GPS still
  // warming up) just means the periodic task covers it instead.
  Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    .then(loc => onUpdate({ lat: loc.coords.latitude, lng: loc.coords.longitude }))
    .catch(() => {})

  if (alreadyRunning) return true

  // Purely time-based (10 min) — distanceInterval: 0 means "don't also
  // trigger early on movement", so the driver's live-location cadence stays
  // predictable regardless of how far/fast they drive between pings.
  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 600000,
    distanceInterval: 0,
    foregroundService: {
      notificationTitle: 'Czen Driver đang theo dõi vị trí',
      notificationBody: 'Giúp báo cho khách hàng khi bạn sắp đến điểm đón.',
    },
  })

  return true
}

export async function stopTracking(): Promise<void> {
  tracking = false
  const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
  if (running) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
  }
}
