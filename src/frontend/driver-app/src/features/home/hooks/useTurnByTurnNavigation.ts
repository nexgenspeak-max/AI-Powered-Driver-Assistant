import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { driversService } from '../../../services/api/drivers'
import { decodePolyline } from '../../../utils/polyline'
import { distanceMeters, type LatLng } from '../../../utils/geo'
import { advanceStepIndex, offRouteTick, remainingFromPosition } from '../lib/navigationMath'
import type { RouteStep } from '../../../types'

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
  // True while the driver is off the drawn route (before/while re-routing).
  offRoute: boolean
  // True while an automatic off-route re-fetch is in flight — the HUD keeps
  // showing the last known steps and adds a "đang tính lại" caption, so the
  // driver never sees the instruction card blank out mid-drive.
  rerouting: boolean
}

// Fetches turn-by-turn steps once per (active, destination) pair, then
// tracks progress locally against the live `origin` (see lib/navigationMath
// for the pure rules). If the driver leaves the drawn route, it re-fetches
// from their current position automatically — throttled, and keeping the
// previous steps on screen until the new ones land. `refresh()` stays
// exposed for the HUD's manual "làm mới" button on a failed fetch.
export function useTurnByTurnNavigation(
  active: boolean,
  origin: LatLng | null,
  destination: LatLng | null,
): TurnByTurnState & { refresh: () => void } {
  const [steps, setSteps] = useState<RouteStep[]>([])
  const [polyline, setPolyline] = useState<string | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [rerouting, setRerouting] = useState(false)
  const [error, setError] = useState(false)
  const [offRoute, setOffRoute] = useState(false)
  const fetchedForRef = useRef<string | null>(null)
  const originRef = useRef<LatLng | null>(origin)
  const offRouteTicksRef = useRef(0)
  const lastRerouteAtRef = useRef(0)
  const inFlightRef = useRef(false)
  originRef.current = origin

  const destinationKey = destination ? `${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}` : null

  const fetchSteps = useCallback(
    (mode: 'initial' | 'reroute' = 'initial') => {
      const from = originRef.current
      if (!from || !destination || inFlightRef.current) return
      inFlightRef.current = true
      if (mode === 'reroute') setRerouting(true)
      else setLoading(true)
      setError(false)
      driversService
        .getNavigation(from, destination)
        .then(route => {
          setSteps(route.steps)
          setPolyline(route.polyline)
          setStepIndex(0)
          offRouteTicksRef.current = 0
          setOffRoute(false)
        })
        .catch(() => {
          // A failed re-route keeps the old steps on screen (still useful
          // once the driver rejoins the route); only an initial fetch has
          // nothing to fall back to and surfaces the error card.
          if (mode === 'initial') setError(true)
        })
        .finally(() => {
          inFlightRef.current = false
          setLoading(false)
          setRerouting(false)
        })
    },
    [destination],
  )

  // Fetches once per destination while active — resets on deactivate so
  // resuming navigation later always starts from a fresh route rather than
  // silently reusing a possibly stale/expired one. Waits for `origin` too:
  // marking fetchedForRef before a GPS fix exists used to permanently skip
  // the fetch.
  useEffect(() => {
    if (!active || !destinationKey) {
      fetchedForRef.current = null
      offRouteTicksRef.current = 0
      setOffRoute(false)
      // Clear the finished leg too: the pickup leg's steps (index past the
      // end, i.e. "arrived") survived deactivation, so starting navigation
      // to the drop-off read as arrived at once and closed itself before
      // its own route arrived (simulator 2026-10-18).
      setSteps([])
      setPolyline(null)
      setStepIndex(0)
      return
    }
    if (!origin) return
    if (fetchedForRef.current === destinationKey) return
    fetchedForRef.current = destinationKey
    fetchSteps('initial')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, destinationKey, origin])

  // Decoded once per polyline for the off-route distance check.
  const routePath = useMemo<LatLng[]>(() => (polyline ? decodePolyline(polyline) : []), [polyline])

  // Progress + off-route tracking on every GPS tick.
  useEffect(() => {
    if (!active || !origin || steps.length === 0) return

    const idx = advanceStepIndex(origin, steps, stepIndex)
    if (idx !== stepIndex) setStepIndex(idx)
    if (idx >= steps.length) return // arrived — no re-route from here

    const tick = offRouteTick(origin, routePath, offRouteTicksRef.current, lastRerouteAtRef.current, Date.now())
    offRouteTicksRef.current = tick.ticks
    if (tick.offRoute !== offRoute) setOffRoute(tick.offRoute)
    if (tick.shouldReroute) {
      lastRerouteAtRef.current = Date.now()
      fetchSteps('reroute')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, steps, routePath])

  const arrived = steps.length > 0 && stepIndex >= steps.length
  const distanceToManeuverM =
    !arrived && origin && steps[stepIndex] ? distanceMeters(origin, steps[stepIndex].end_location) : null

  const remaining = arrived ? { km: 0, min: 0 } : remainingFromPosition(origin, steps, stepIndex)

  return {
    loading,
    error,
    steps,
    currentStepIndex: stepIndex,
    distanceToManeuverM,
    remainingKm: remaining ? remaining.km : null,
    remainingMin: remaining ? remaining.min : null,
    arrived,
    polyline,
    offRoute,
    rerouting,
    refresh: () => fetchSteps('initial'),
  }
}
