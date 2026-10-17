import { useEffect, useMemo, useState } from 'react'
import { useDriverContext } from '../../dashboard/hooks/useDriverContext'
import { useLiveDriverLocation } from './useLiveDriverLocation'
import { useTurnByTurnNavigation } from './useTurnByTurnNavigation'
import { decodePolyline } from '../../../utils/polyline'
import { pushImmediateLocation } from '../../../services/location/pushImmediateLocation'
import { colorForTrip, type LngLat } from '../lib/mapConstants'
import type { Trip } from '../../../types/trip'

type ActiveTrip = Trip & { estimated_fare: number }

const EMPTY_TRIPS: ActiveTrip[] = []

export type MapStopMarker = {
  trip: ActiveTrip
  color: string
  point: LngLat
}

// What the NextStopCard shows: the first stop of the optimized order, or the
// single active trip's pickup/dropoff when there is nothing to order.
export type NextStop = {
  kind: 'pickup' | 'dropoff'
  customerName: string
  customerPhone: string
  address: string
  lat: number
  lng: number
  distanceKm: number | null
  etaMinutes: number | null
}

export function useDriverMapModel() {
  const { data: context } = useDriverContext()
  const live = useLiveDriverLocation(context?.driver.status === 'online')

  // Stable identity when lat/lng unchanged — DriverMap camera effect must not
  // see a new array every render or setCameraStop loops ("Maximum update depth").
  const driverPoint = useMemo<LngLat | null>(() => {
    if (live) return [live.lng, live.lat]
    if (context?.current_location) {
      return [context.current_location.lng, context.current_location.lat]
    }
    return null
  }, [live?.lng, live?.lat, context?.current_location?.lng, context?.current_location?.lat])

  const trips = context?.active_trips ?? EMPTY_TRIPS

  const pickupPoints = useMemo<MapStopMarker[]>(
    () =>
      trips
        .map((t, i) => ({ trip: t, color: colorForTrip(i) }))
        .filter((e): e is typeof e & { trip: ActiveTrip & { pickup_lat: number; pickup_lng: number } } =>
          typeof e.trip.pickup_lat === 'number' && typeof e.trip.pickup_lng === 'number',
        )
        .map(e => ({ trip: e.trip, color: e.color, point: [e.trip.pickup_lng, e.trip.pickup_lat] })),
    [trips],
  )
  const dropoffPoints = useMemo<MapStopMarker[]>(
    () =>
      trips
        .map((t, i) => ({ trip: t, color: colorForTrip(i) }))
        .filter((e): e is typeof e & { trip: ActiveTrip & { dropoff_lat: number; dropoff_lng: number } } =>
          typeof e.trip.dropoff_lat === 'number' && typeof e.trip.dropoff_lng === 'number',
        )
        .map(e => ({ trip: e.trip, color: e.color, point: [e.trip.dropoff_lng, e.trip.dropoff_lat] })),
    [trips],
  )

  const allPoints = useMemo(() => {
    const pts: LngLat[] = []
    if (driverPoint) pts.push(driverPoint)
    for (const m of pickupPoints) pts.push(m.point)
    for (const m of dropoffPoints) pts.push(m.point)
    return pts
  }, [driverPoint, pickupPoints, dropoffPoints])

  const colorByTripId = useMemo(() => {
    const byId: Record<string, string> = {}
    trips.forEach((t, i) => { byId[t.trip_id] = colorForTrip(i) })
    return byId
  }, [trips])

  const optimizedRoute = context?.optimized_route ?? null

  const nextStop = useMemo<NextStop | null>(() => {
    const first = optimizedRoute?.stops[0]
    if (first) {
      const trip = trips.find(t => t.trip_id === first.trip_id)
      return {
        kind: first.kind,
        customerName: first.customer_name || trip?.customer_name || '',
        customerPhone: trip?.customer_phone || '',
        address: first.address,
        lat: first.lat,
        lng: first.lng,
        distanceKm: first.distance_m > 0 ? first.distance_m / 1000 : null,
        etaMinutes: first.eta_minutes > 0 ? first.eta_minutes : null,
      }
    }
    const trip = context?.current_trip
    if (!trip) return null
    const toDropoff = trip.status === 'picked_up'
    const lat = toDropoff ? trip.dropoff_lat : trip.pickup_lat
    const lng = toDropoff ? trip.dropoff_lng : trip.pickup_lng
    if (typeof lat !== 'number' || typeof lng !== 'number') return null
    return {
      kind: toDropoff ? 'dropoff' : 'pickup',
      customerName: trip.customer_name,
      customerPhone: trip.customer_phone,
      address: toDropoff ? trip.dropoff_address : trip.pickup_address,
      lat,
      lng,
      // The trip's own leg figures describe pickup->dropoff, so they only
      // apply once the customer is on board; the drive TO the pickup has no
      // server figure until the optimized route (above) provides one.
      distanceKm: toDropoff && trip.distance_km > 0 ? trip.distance_km : null,
      etaMinutes: toDropoff && trip.eta_minutes > 0 ? trip.eta_minutes : null,
    }
  }, [optimizedRoute, context?.current_trip, trips])

  const navigationTarget = useMemo(
    () => (nextStop ? { lat: nextStop.lat, lng: nextStop.lng } : null),
    [nextStop?.lat, nextStop?.lng],
  )

  // Bumped by the "my location" button — DriverMap's camera effect keys a
  // one-shot recenter on it, so repeated taps re-center every time even when
  // the driver point itself hasn't moved.
  const [recenterTick, setRecenterTick] = useState(0)
  const recenter = () => setRecenterTick(t => t + 1)

  const isOnline = context?.driver.status === 'online'
  const activeTripCount = trips.length
  const hasContext = !!context
  const todayEarnings = context?.today_earnings ?? null

  const [navActive, setNavActive] = useState(false)
  const navOrigin = useMemo(() => (live ? { lat: live.lat, lng: live.lng } : null), [live?.lat, live?.lng])
  const nav = useTurnByTurnNavigation(navActive, navOrigin, navigationTarget)

  useEffect(() => {
    if (navActive && nav.arrived) setNavActive(false)
  }, [navActive, nav.arrived])

  useEffect(() => {
    if (navActive && !navigationTarget) setNavActive(false)
  }, [navActive, navigationTarget])

  const navRouteGeoJson = useMemo(() => {
    if (!navActive || !nav.polyline) return null
    const coords = decodePolyline(nav.polyline).map(p => [p.lng, p.lat] as [number, number])
    if (coords.length < 2) return null
    return { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: coords } }
  }, [navActive, nav.polyline])

  const routeOrderByKey = useMemo(() => {
    const byKey: Record<string, number> = {}
    optimizedRoute?.stops.forEach((s, i) => { byKey[`${s.kind}-${s.trip_id}`] = i + 1 })
    return byKey
  }, [optimizedRoute])

  const routeLineGeoJson = useMemo(() => {
    if (!optimizedRoute || optimizedRoute.stops.length === 0) return null
    const coords: [number, number][] =
      optimizedRoute.path.length > 0
        ? optimizedRoute.path.map(p => [p.lng, p.lat])
        : [
            ...(driverPoint ? [driverPoint] : []),
            ...optimizedRoute.stops.map(s => [s.lng, s.lat] as [number, number]),
          ]
    if (coords.length < 2) return null
    return { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: coords } }
  }, [optimizedRoute, driverPoint])

  const tripIdsKey = trips.map(t => t.trip_id).join(',')
  const hasDriverPoint = driverPoint !== null
  const driverUpdatedAt = live?.updatedAt ?? context?.current_location?.updated_at ?? null

  const startNavigation = () => {
    pushImmediateLocation()
    setNavActive(true)
  }

  return {
    live,
    driverPoint,
    pickupPoints,
    dropoffPoints,
    allPoints,
    colorByTripId,
    optimizedRoute,
    nextStop,
    navigationTarget,
    recenterTick,
    recenter,
    isOnline,
    activeTripCount,
    hasContext,
    todayEarnings,
    navActive,
    setNavActive,
    nav,
    navRouteGeoJson,
    routeLineGeoJson,
    routeOrderByKey,
    driverUpdatedAt,
    tripIdsKey,
    hasDriverPoint,
    startNavigation,
  }
}
