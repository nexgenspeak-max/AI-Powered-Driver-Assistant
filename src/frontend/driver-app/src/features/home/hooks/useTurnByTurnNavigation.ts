import { useCallback, useEffect, useRef, useState } from 'react'
import { driversService } from '../../../services/api/drivers'
import { distanceMeters, type LatLng } from '../../../utils/geo'
import type { RouteStep } from '../../../types'

// How close (meters) to a step's end_location counts as "passed this
// maneuver" — loose enough for GPS noise/foreground-watch cadence (~3s/5m
// ticks, see useLiveDriverLocation), tight enough not to skip a real turn.
const ARRIVAL_THRESHOLD_M = 35

export interface TurnByTurnState {
  loading: boolean
  error: boolean
  steps: RouteStep[]
  currentStepIndex: number
  // null once arrived (nothing left to measure toward).
  distanceToManeuverM: number | null
  remainingKm: number | null
  remainingMin: number | null
  arrived: boolean
  // Raw encoded overview polyline for the whole leg — undecoded (see
  // utils/polyline.ts's decodePolyline), for drawing the nav route line.
  polyline: string | null
}

// Fetches turn-by-turn steps ONCE per (active, destination) pair — not on
// every GPS tick — then tracks progress locally by comparing the live
// `origin` against each step's end_location. No live re-routing: if the
// driver goes off-route, `refresh()` (exposed for a manual "làm mới" button
// in the HUD) re-fetches from their current position, same as starting
// fresh — good enough for v1, real automatic reroute-on-deviation is a
// bigger feature left for later.
export function useTurnByTurnNavigation(
  active: boolean,
  origin: LatLng | null,
  destination: LatLng | null,
): TurnByTurnState & { refresh: () => void } {
  const [steps, setSteps] = useState<RouteStep[]>([])
  const [polyline, setPolyline] = useState<string | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const fetchedForRef = useRef<string | null>(null)

  const destinationKey = destination ? `${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}` : null

  const fetchSteps = useCallback(() => {
    if (!origin || !destination) return
    setLoading(true)
    setError(false)
    driversService
      .getNavigation(origin, destination)
      .then(route => {
        setSteps(route.steps)
        setPolyline(route.polyline)
        setStepIndex(0)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [origin, destination])

  // Fetches once per destination while active — resets on deactivate so
  // resuming navigation later always starts from a fresh route rather than
  // silently reusing a possibly stale/expired one. Waits for `origin` too
  // (not just active+destination): marking fetchedForRef before a GPS fix
  // exists used to permanently skip the fetch — fetchSteps() would no-op
  // (no origin) but the ref was already set, so the real fetch never fired
  // even once a fix landed a moment later, leaving the HUD blank until nav
  // was toggled off and back on.
  useEffect(() => {
    if (!active || !destinationKey) {
      fetchedForRef.current = null
      return
    }
    if (!origin) return
    if (fetchedForRef.current === destinationKey) return
    fetchedForRef.current = destinationKey
    fetchSteps()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, destinationKey, origin])

  // Advances past every step whose end_location the driver has already
  // reached — a `while`, not an `if`, so a sparse GPS tick that jumped past
  // more than one short step (e.g. two quick turns close together) still
  // lands on the right current step instead of getting stuck one behind.
  useEffect(() => {
    if (!active || !origin || steps.length === 0) return
    let idx = stepIndex
    while (idx < steps.length && distanceMeters(origin, steps[idx].end_location) <= ARRIVAL_THRESHOLD_M) {
      idx++
    }
    if (idx !== stepIndex) setStepIndex(idx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, steps])

  const arrived = steps.length > 0 && stepIndex >= steps.length
  const distanceToManeuverM =
    !arrived && origin && steps[stepIndex] ? distanceMeters(origin, steps[stepIndex].end_location) : null

  let remainingKm: number | null = null
  let remainingMin: number | null = null
  if (steps.length > 0) {
    const remaining = steps.slice(stepIndex)
    remainingKm = Math.round((remaining.reduce((sum, s) => sum + s.distance_m, 0) / 1000) * 10) / 10
    remainingMin = Math.round(remaining.reduce((sum, s) => sum + s.duration_s, 0) / 60)
  }

  return {
    loading,
    error,
    steps,
    currentStepIndex: stepIndex,
    distanceToManeuverM,
    remainingKm,
    remainingMin,
    arrived,
    polyline,
    refresh: fetchSteps,
  }
}
