import { useEffect, useMemo, useRef } from 'react'
import { StyleSheet, View, Text, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Map, Camera, Marker, type LngLat, type LngLatBounds, type CameraRef } from '@maplibre/maplibre-react-native'
import { useCustomerContext } from '../hooks/useCustomerContext'

// Ported from driver-app's DriverMap.tsx, trimmed down to what a customer
// actually needs to see: their own booked trip(s) — pickup/dropoff pins,
// none of driver-app's turn-by-turn navigation or multi-stop route
// optimization, which are driver-only concerns — plus the assigned driver's
// live position once one is en route. See useCustomerContext.ts /
// buildCustomerContext (trip-service) for where active_trips/driver_location
// come from.

const GOONG_MAPS_KEY = process.env.EXPO_PUBLIC_GOONG_MAPS_KEY ?? ''
const GOONG_STYLE_URL = `https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_MAPS_KEY}`

// Hanoi — only used as a last-resort camera target before there's any real
// point (a booked trip or the driver's position) to aim at.
const DEFAULT_CENTER: LngLat = [105.8342, 21.0278]
const DEFAULT_ZOOM = 12
const SINGLE_POINT_ZOOM = 14
const FIT_PADDING = { top: 100, right: 60, bottom: 60, left: 60 }

const DRIVER_COLOR = '#8B5CF6'
// One color per trip (pickup AND dropoff of the same trip share a color) —
// same scheme as driver-app's DriverMap, cycles if there's ever more than
// one active booking at once.
const TRIP_COLORS = ['#2563eb', '#16a34a', '#f97316', '#db2777', '#0891b2', '#a16207', '#dc2626', '#4f46e5']

function colorForTrip(index: number): string {
  return TRIP_COLORS[index % TRIP_COLORS.length]
}

function boundsFromPoints(points: LngLat[]): LngLatBounds | null {
  if (points.length === 0) return null
  let west = points[0][0]
  let east = points[0][0]
  let south = points[0][1]
  let north = points[0][1]
  for (const [lng, lat] of points) {
    if (lng < west) west = lng
    if (lng > east) east = lng
    if (lat < south) south = lat
    if (lat > north) north = lat
  }
  return [west, south, east, north]
}

const DRIVER_CAR_ICON = require('../../../../assets/icons/light/car.png')

function DriverPositionMarker() {
  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#ffffff',
        borderWidth: 2,
        borderColor: DRIVER_COLOR,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
      }}
    >
      <Image source={DRIVER_CAR_ICON} style={{ width: 30, height: 30 }} resizeMode="contain" />
    </View>
  )
}

// A label alone (the old version) floats over the map with nothing marking
// exactly which point below it is the real coordinate — fine for a driver
// juggling many stops at a glance, but a customer looking for "where
// exactly is my pickup" needs a precise anchor. Adds a small solid dot
// right at the coordinate (Marker below still anchors "bottom", so the DOT
// itself — not the label — sits exactly on the lat/lng), with a thin
// connector line up to the label so the two visually read as one marker.
const DOT_SIZE = 14
const CONNECTOR_HEIGHT = 6

function StopMarker({ kind, name, color }: { kind: 'pickup' | 'dropoff'; name: string; color: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          backgroundColor: color,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: '#ffffff',
          paddingHorizontal: 8,
          paddingVertical: 4,
          maxWidth: 160,
        }}
      >
        <Ionicons name={kind === 'pickup' ? 'location' : 'flag'} size={12} color="#ffffff" />
        <Text numberOfLines={1} style={{ color: '#ffffff', fontSize: 11, fontWeight: '600' }}>
          {name}
        </Text>
      </View>
      <View style={{ width: 2, height: CONNECTOR_HEIGHT, backgroundColor: color }} />
      <View
        style={{
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: DOT_SIZE / 2,
          backgroundColor: color,
          borderWidth: 2,
          borderColor: '#ffffff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.3,
          shadowRadius: 2,
          elevation: 3,
        }}
      />
    </View>
  )
}

export function CustomerMap() {
  const { data: context } = useCustomerContext()
  const trips = context?.active_trips ?? []

  const pickupPoints = useMemo(
    () =>
      trips
        .map((t, i) => ({ trip: t, color: colorForTrip(i) }))
        .filter((e): e is typeof e & { trip: typeof e.trip & { pickup_lat: number; pickup_lng: number } } =>
          typeof e.trip.pickup_lat === 'number' && typeof e.trip.pickup_lng === 'number',
        )
        .map(e => ({ trip: e.trip, color: e.color, point: [e.trip.pickup_lng, e.trip.pickup_lat] as LngLat })),
    [trips],
  )
  const dropoffPoints = useMemo(
    () =>
      trips
        .map((t, i) => ({ trip: t, color: colorForTrip(i) }))
        .filter((e): e is typeof e & { trip: typeof e.trip & { dropoff_lat: number; dropoff_lng: number } } =>
          typeof e.trip.dropoff_lat === 'number' && typeof e.trip.dropoff_lng === 'number',
        )
        .map(e => ({ trip: e.trip, color: e.color, point: [e.trip.dropoff_lng, e.trip.dropoff_lat] as LngLat })),
    [trips],
  )

  const driverPoint: LngLat | null = context?.driver_location
    ? [context.driver_location.lng, context.driver_location.lat]
    : null

  const allPoints = useMemo(() => {
    const pts: LngLat[] = []
    if (driverPoint) pts.push(driverPoint)
    for (const m of pickupPoints) pts.push(m.point)
    for (const m of dropoffPoints) pts.push(m.point)
    return pts
  }, [driverPoint, pickupPoints, dropoffPoints])

  const cameraRef = useRef<CameraRef>(null)
  const hasFitOnceRef = useRef(false)
  const tripIdsKey = trips.map(t => t.trip_id).join(',')
  // The one thing that actually proves a NEW driver GPS reading landed (not
  // just an unchanged 5s poll re-fetch) — driverPoint itself is a fresh
  // array every render even when the coordinates haven't changed.
  const driverUpdatedAt = context?.driver_location?.updated_at ?? null

  // First-ever camera placement: fit around whatever points already exist
  // (trip pins + driver, if already en route). Nothing to fit against yet
  // (no booked trip) falls back to the static default center.
  useEffect(() => {
    if (hasFitOnceRef.current || allPoints.length === 0) return
    if (allPoints.length === 1) {
      cameraRef.current?.easeTo({ center: allPoints[0], zoom: SINGLE_POINT_ZOOM, duration: 0 })
    } else {
      const bounds = boundsFromPoints(allPoints)
      if (bounds) cameraRef.current?.fitBounds(bounds, { padding: FIT_PADDING, duration: 0 })
    }
    hasFitOnceRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPoints.length])

  // Re-fits whenever the SET of trips changes (a new booking, one dropped
  // off the active list) — not on every 5s poll tick, so a customer
  // manually panning/zooming doesn't get yanked back on an unrelated poll.
  useEffect(() => {
    if (!hasFitOnceRef.current || allPoints.length === 0) return
    if (allPoints.length === 1) {
      cameraRef.current?.easeTo({ center: allPoints[0], zoom: SINGLE_POINT_ZOOM, duration: 500 })
    } else {
      const bounds = boundsFromPoints(allPoints)
      if (bounds) cameraRef.current?.fitBounds(bounds, { padding: FIT_PADDING, duration: 500 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripIdsKey])

  // Follows the driver's position once one is en route — keyed on
  // `updated_at`, not on every poll tick, so this only actually moves the
  // camera when a genuinely new reading lands (driver-app's own GPS push is
  // throttled server-side, see driverContextService.ts).
  useEffect(() => {
    if (!hasFitOnceRef.current || !driverPoint) return
    cameraRef.current?.easeTo({ center: driverPoint, duration: 800 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverUpdatedAt])

  return (
    <View style={StyleSheet.absoluteFill}>
      <Map style={{ flex: 1 }} mapStyle={GOONG_STYLE_URL} logo={false}>
        <Camera ref={cameraRef} initialViewState={{ center: allPoints[0] ?? DEFAULT_CENTER, zoom: DEFAULT_ZOOM }} />

        {driverPoint && (
          <Marker id="driver" lngLat={driverPoint}>
            <DriverPositionMarker />
          </Marker>
        )}
        {pickupPoints.map(({ trip, point, color }) => (
          <Marker key={`pickup-${trip.trip_id}`} id={`pickup-${trip.trip_id}`} lngLat={point} anchor="bottom">
            <StopMarker kind="pickup" name={trip.pickup_address || 'Điểm đón'} color={color} />
          </Marker>
        ))}
        {dropoffPoints.map(({ trip, point, color }) => (
          <Marker key={`dropoff-${trip.trip_id}`} id={`dropoff-${trip.trip_id}`} lngLat={point} anchor="bottom">
            <StopMarker kind="dropoff" name={trip.dropoff_address || 'Điểm đến'} color={color} />
          </Marker>
        ))}
      </Map>
    </View>
  )
}
