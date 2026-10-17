// Pure navigation math — no React, no I/O — so `scripts/verify-navigation.mjs`
// can exercise it under plain Node. The hook (useTurnByTurnNavigation.ts)
// only wires these to GPS ticks and the fetch.
import { distanceMeters, distanceToPathMeters, type LatLng } from '../../../utils/geo'
import type { RouteStep } from '../../../types'

// How close (meters) to a step's end_location counts as "passed this
// maneuver" — loose enough for GPS noise/foreground-watch cadence (~3s/5m
// ticks, see useLiveDriverLocation), tight enough not to skip a real turn.
export const ARRIVAL_THRESHOLD_M = 35

// Off-route detection: the driver has to sit further than this from the
// drawn route for this many consecutive GPS ticks before we re-fetch.
// 50 m absorbs urban GPS drift and a wrong-lane fix; three ticks (~10 s)
// avoids re-routing on a single bad reading. Re-fetches are throttled so a
// driver circling a block can't fire one request per tick.
export const OFF_ROUTE_THRESHOLD_M = 50
export const OFF_ROUTE_TICKS = 3
export const REROUTE_MIN_INTERVAL_MS = 20_000

/**
 * Where `point` sits along the segment start->end: 0 at start, 1 at end,
 * >1 past the end, <0 before the start. Equirectangular projection around
 * `start`. Returns 0 for a zero-length segment.
 */
export function alongSegment(point: LatLng, start: LatLng, end: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const cosLat = Math.cos(toRad(start.lat))
  const ex = toRad(end.lng - start.lng) * cosLat
  const ey = toRad(end.lat - start.lat)
  const px = toRad(point.lng - start.lng) * cosLat
  const py = toRad(point.lat - start.lat)
  const lenSq = ex * ex + ey * ey
  if (lenSq === 0) return 0
  return (px * ex + py * ey) / lenSq
}

/**
 * Advances past every step whose end_location the driver has reached — or
 * overshot.
 *
 * Two triggers per step:
 *  1. within ARRIVAL_THRESHOLD_M of the step's end (the classic case);
 *  2. the driver's position projects BEYOND the step's end along the
 *     step's own direction (alongSegment > 1) — a sparse GPS tick that
 *     jumped past a short step (two quick turns in a row) never comes
 *     within 35 m of that turn at all, and used to leave the HUD stuck one
 *     instruction behind. Direction-aware, so a point 60 m short of the
 *     turn and one 60 m past it are told apart.
 */
export function advanceStepIndex(origin: LatLng, steps: RouteStep[], fromIndex: number): number {
  let idx = fromIndex
  while (idx < steps.length) {
    const step = steps[idx]
    if (distanceMeters(origin, step.end_location) <= ARRIVAL_THRESHOLD_M) {
      idx++
      continue
    }
    if (alongSegment(origin, step.start_location, step.end_location) > 1) {
      idx++
      continue
    }
    break
  }
  return idx
}

/** Remaining distance/time from the driver's actual position, not from the start of the current step. */
export function remainingFromPosition(
  origin: LatLng | null,
  steps: RouteStep[],
  stepIndex: number,
): { km: number; min: number } | null {
  if (steps.length === 0) return null
  const current = steps[stepIndex]
  if (!current) return { km: 0, min: 0 }
  const rest = steps.slice(stepIndex + 1)
  const restM = rest.reduce((sum, s) => sum + s.distance_m, 0)
  const restS = rest.reduce((sum, s) => sum + s.duration_s, 0)
  // Portion of the current step still ahead: straight-line to its end,
  // capped at the step's own length (GPS can sit slightly "behind" the
  // step start and read longer than the road distance).
  const aheadM = origin ? Math.min(current.distance_m, distanceMeters(origin, current.end_location)) : current.distance_m
  const fraction = current.distance_m > 0 ? aheadM / current.distance_m : 1
  const aheadS = current.duration_s * fraction
  return {
    km: Math.round(((restM + aheadM) / 1000) * 10) / 10,
    min: Math.round((restS + aheadS) / 60),
  }
}

/**
 * Off-route state machine for one GPS tick. Returns the new consecutive
 * off-route tick count and whether a re-route should fire now (threshold
 * reached AND the throttle window has elapsed).
 */
export function offRouteTick(
  origin: LatLng,
  routePath: LatLng[],
  ticksSoFar: number,
  lastRerouteAt: number,
  now: number,
): { ticks: number; offRoute: boolean; shouldReroute: boolean } {
  if (routePath.length < 2) return { ticks: 0, offRoute: false, shouldReroute: false }
  const away = distanceToPathMeters(origin, routePath)
  if (away <= OFF_ROUTE_THRESHOLD_M) return { ticks: 0, offRoute: false, shouldReroute: false }
  const ticks = ticksSoFar + 1
  if (ticks < OFF_ROUTE_TICKS) return { ticks, offRoute: false, shouldReroute: false }
  const throttled = now - lastRerouteAt < REROUTE_MIN_INTERVAL_MS
  return { ticks, offRoute: true, shouldReroute: !throttled }
}
