import { distanceMeters, type LatLng } from '../../../utils/geo'

// When to send the live GPS fix to the backend (POST /me/location/live).
//
// The backend runs the "sắp đến điểm đón → gọi nhắc khách" check on every
// push (routes/drivers.ts runProximityChecks, radius default 1 km). A flat
// 10-minute cadence meant a driver at 30 km/h covered ~5 km between checks,
// so the 1 km reminder fired late or never. Cadence now follows how close
// the driver is to an active stop — idle drivers stay on the cheap 10-min
// ping, a driver closing in on a pickup is checked every few hundred metres.

export const IDLE_INTERVAL_MS = 10 * 60 * 1000
export const EN_ROUTE_INTERVAL_MS = 60 * 1000
export const EN_ROUTE_MOVE_M = 500
export const NEAR_STOP_M = 3000
export const NEAR_INTERVAL_MS = 15 * 1000
export const NEAR_MOVE_M = 150

export type PushPolicy = { intervalMs: number; moveM: number | null }

export function nearestStopMeters(here: LatLng, stops: LatLng[]): number | null {
  let best: number | null = null
  for (const s of stops) {
    const d = distanceMeters(here, s)
    if (best == null || d < best) best = d
  }
  return best
}

export function pushPolicy(here: LatLng, stops: LatLng[]): PushPolicy {
  const d = nearestStopMeters(here, stops)
  if (d == null) return { intervalMs: IDLE_INTERVAL_MS, moveM: null }
  if (d <= NEAR_STOP_M) return { intervalMs: NEAR_INTERVAL_MS, moveM: NEAR_MOVE_M }
  return { intervalMs: EN_ROUTE_INTERVAL_MS, moveM: EN_ROUTE_MOVE_M }
}

/** Push now? Due by time, or by distance moved since the last push. */
export function shouldPush(args: {
  now: number
  lastPushAt: number
  here: LatLng
  lastPushed: LatLng | null
  stops: LatLng[]
}): boolean {
  const { now, lastPushAt, here, lastPushed, stops } = args
  if (lastPushAt === 0 || !lastPushed) return true
  const policy = pushPolicy(here, stops)
  if (now - lastPushAt >= policy.intervalMs) return true
  if (policy.moveM != null && distanceMeters(lastPushed, here) >= policy.moveM) return true
  return false
}
