import { Platform } from 'react-native'
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import { distanceMeters } from '../../../utils/geo'

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
// Re-register once per app launch so a task still running from an older
// build picks up the current options below.
let configuredThisLaunch = false

// JS-side floor on top of the OS filters: iOS ignores `timeInterval`
// (Android-only in expo-location) and, with distanceInterval 0, delivered a
// fix — and so a POST /me/location — every second while driving (measured
// on the simulator 2026-10-18: 31 pings in 28 s). At most one push per
// MIN_GAP_MS unless the driver moved MIN_MOVE_M, which still keeps the
// backend's 1 km pickup-approach check well inside the radius.
const MIN_GAP_MS = 20 * 1000
const MIN_MOVE_M = 150
let lastSentAt = 0
let lastSent: DriverCoords | null = null

function dueToSend(c: DriverCoords): boolean {
  const now = Date.now()
  if (!lastSent || now - lastSentAt >= MIN_GAP_MS || distanceMeters(lastSent, c) >= MIN_MOVE_M) {
    lastSentAt = now
    lastSent = c
    return true
  }
  return false
}

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('[locationTracking] task error', error.message)
    return
  }
  if (!tracking) return

  const { locations } = (data ?? {}) as { locations?: Location.LocationObject[] }
  const last = locations?.[locations.length - 1]
  if (!last) return

  const coords = { lat: last.coords.latitude, lng: last.coords.longitude }
  if (dueToSend(coords)) onUpdate(coords)
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
  // expo-location has no background task API on web (the function is simply
  // absent) — the Chuyến tab crashed the whole web preview on this line.
  if (Platform.OS === 'web') return false
  let alreadyRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
  if (alreadyRunning && !configuredThisLaunch) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => {})
    alreadyRunning = false
  }

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

  // OS-level filters (the JS floor above still applies): ~100 m on both
  // platforms, iOS batches background fixes (deferred*) and uses the
  // automotive activity profile; Android's timeInterval caps the rate.
  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 30000,
    distanceInterval: 100,
    deferredUpdatesInterval: 30000,
    deferredUpdatesDistance: MIN_MOVE_M,
    activityType: Location.ActivityType.AutomotiveNavigation,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Czen đang theo dõi vị trí',
      notificationBody: 'Giúp báo cho khách hàng khi bạn sắp đến điểm đón.',
    },
  })
  configuredThisLaunch = true

  return true
}

export async function stopTracking(): Promise<void> {
  tracking = false
  const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
  if (running) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
  }
}
