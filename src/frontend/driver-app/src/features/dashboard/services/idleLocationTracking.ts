import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'

// Separate task name from locationTracking.ts's LOCATION_TASK_NAME —
// expo-location ties timeInterval/distanceInterval to the task at start
// time, so idle tracking (driver `online`, no trip yet — sparser, to save
// battery) and active-trip tracking (confirmed/picked_up — 15s/50m) can't
// share one task and run at two different rates simultaneously.
const IDLE_LOCATION_TASK_NAME = 'driver-idle-location-task'

export interface DriverCoords {
  lat: number
  lng: number
}

type IdleLocationHandler = (coords: DriverCoords) => void

let onUpdate: IdleLocationHandler = (coords) => {
  console.log('[idleLocationTracking] ->', coords)
}

TaskManager.defineTask(IDLE_LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('[idleLocationTracking] task error', error.message)
    return
  }

  const { locations } = (data ?? {}) as { locations?: Location.LocationObject[] }
  const last = locations?.[locations.length - 1]
  if (!last) return

  onUpdate({ lat: last.coords.latitude, lng: last.coords.longitude })
})

export function setIdleLocationUpdateHandler(handler: IdleLocationHandler): void {
  onUpdate = handler
}

// Same foreground-then-background permission flow as locationTracking.ts's
// ensurePermission() — duplicated rather than shared since the two tasks'
// lifecycles are independent (a driver can be idle-tracking without ever
// having an active trip).
async function ensurePermission(): Promise<boolean> {
  const fg = await Location.getForegroundPermissionsAsync()
  const fgGranted = fg.granted ? true : (await Location.requestForegroundPermissionsAsync()).granted
  if (!fgGranted) return false

  const bg = await Location.getBackgroundPermissionsAsync()
  return bg.granted ? true : (await Location.requestBackgroundPermissionsAsync()).granted
}

export async function startIdleTracking(): Promise<boolean> {
  const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(IDLE_LOCATION_TASK_NAME)
  if (alreadyRunning) return true

  const granted = await ensurePermission()
  if (!granted) return false

  await Location.startLocationUpdatesAsync(IDLE_LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 45000,
    distanceInterval: 100,
    foregroundService: {
      notificationTitle: 'Czen Driver đang online',
      notificationBody: 'Sẵn sàng nhận chuyến gần bạn.',
    },
  })

  return true
}

export async function stopIdleTracking(): Promise<void> {
  const running = await Location.hasStartedLocationUpdatesAsync(IDLE_LOCATION_TASK_NAME)
  if (running) {
    await Location.stopLocationUpdatesAsync(IDLE_LOCATION_TASK_NAME)
  }
}
