import { useEffect, useMemo, useState } from 'react'
import { useDriverContext } from '../../dashboard/hooks/useDriverContext'
import { useLiveDriverLocation } from './useLiveDriverLocation'
import { useTurnByTurnNavigation } from './useTurnByTurnNavigation'
import { decodePolyline } from '../../../utils/polyline'
import { pushImmediateLocation } from '../../../services/location/pushImmediateLocation'
import { colorForTrip, type LngLat } from '../lib/mapConstants'
import type { Trip } from '../../../types/trip'

type ActiveTrip = Trip & { estimated_fare: number }

export type MapStopMarker = {
  trip: ActiveTrip
  color: string
  point: LngLat
}

export function useDriverMapModel() {
  const { data: context } = useDriverContext()
  const live = useLiveDriverLocation(context?.driver.status === 'online')

  const driverPoint: LngLat | null = live
    ? [live.lng, live.lat]
    : context?.current_location
      ? [context.current_location.lng, context.current_location.lat]
      : null

  const trips = context?.active_trips ?? []

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

  const navigationTarget = useMemo(() => {
    if (optimizedRoute?.stops[0]) return { lat: optimizedRoute.stops[0].lat, lng: optimizedRoute.stops[0].lng }
    const trip = context?.current_trip
    if (!trip) return null
    const lat = trip.status === 'picked_up' ? trip.dropoff_lat : trip.pickup_lat
    const lng = trip.status === 'picked_up' ? trip.dropoff_lng : trip.pickup_lng
    return typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null
  }, [optimizedRoute, context?.current_trip])

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
    navigationTarget,
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
