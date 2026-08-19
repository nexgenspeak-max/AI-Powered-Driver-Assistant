import { useEffect, useMemo, useRef } from 'react'
import { StyleSheet, View, Text, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Map, Camera, Marker, GeoJSONSource, Layer, type LngLat, type LngLatBounds, type CameraRef } from '@maplibre/maplibre-react-native'
import { useDriverContext } from '../../dashboard/hooks/useDriverContext'
import { useLiveDriverLocation } from '../hooks/useLiveDriverLocation'
import { OptimizedRoutePanel } from './OptimizedRoutePanel'

const DRIVER_VAN_ICON = require('../../../../assets/icons/driver-van.png')

// Goong's vector style JSON (MapLibre-GL-compatible, same underlying tech as
// their web GoongJS SDK) — separate "Maps Key" from the GOONG_API_KEY REST
// key used server-side in trip-service for geocode/direction (see
// trip-service/src/services/maps/goong.ts). Empty until the user creates one
// on the Goong dashboard and fills in envs/.env — tiles just won't load
// until then, everything else below still works.
const GOONG_MAPS_KEY = process.env.EXPO_PUBLIC_GOONG_MAPS_KEY ?? ''
const GOONG_STYLE_URL = `https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_MAPS_KEY}`

// Hanoi — only used as a last-resort camera target before we have any real
// point (driver location or a trip marker) to aim at.
const DEFAULT_CENTER: LngLat = [105.8342, 21.0278]
const DEFAULT_ZOOM = 12
const DRIVER_INITIAL_ZOOM = 15
const SINGLE_POINT_ZOOM = 14
const FIT_PADDING = { top: 100, right: 60, bottom: 60, left: 60 }

const DRIVER_COLOR = '#8B5CF6'
// One color per trip (pickup AND dropoff of the same trip share a color) so
// a driver can visually pair "this pickup goes with that dropoff" at a
// glance — pickup vs dropoff is instead told apart by icon (location pin vs
// flag), not color, since color is now spent distinguishing trips from each
// other. Cycles if there are more active trips than colors.
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

function DriverMarker() {
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
      <Image source={DRIVER_VAN_ICON} style={{ width: 32, height: 32 }} resizeMode="contain" />
    </View>
  )
}

function StopMarker({ kind, name, color, order }: { kind: 'pickup' | 'dropoff'; name: string; color: string; order?: number }) {
  return (
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
        maxWidth: 140,
      }}
    >
      {/* Position in the optimized multi-stop route (routeOrderByKey in
          DriverMap) — absent when there's no route to order against (0-1
          active stops), same marker as before in that case. */}
      {typeof order === 'number' && (
        <View
          style={{
            position: 'absolute',
            top: -9,
            left: -9,
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: '#ffffff',
            borderWidth: 1.5,
            borderColor: color,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '700', color }}>{order}</Text>
        </View>
      )}
      <Ionicons name={kind === 'pickup' ? 'location' : 'flag'} size={12} color="#ffffff" />
      <Text numberOfLines={1} style={{ color: '#ffffff', fontSize: 11, fontWeight: '600' }}>
        {name}
      </Text>
    </View>
  )
}

export function DriverMap() {
  const { data: context } = useDriverContext()
  // Local GPS stream, updates every few seconds straight off the phone —
  // takes priority over the backend's current_location (only refreshed by
  // the ~10-min proximity ping and possibly several minutes stale even then,
  // see driverContextService.ts) whenever it's available. That backend value
  // is only a fallback for the brief window before this device's own GPS has
  // produced a first fix (e.g. right after opening the app).
  const live = useLiveDriverLocation()

  const driverPoint: LngLat | null = live
    ? [live.lng, live.lat]
    : context?.current_location
      ? [context.current_location.lng, context.current_location.lat]
      : null
  const cameraRef = useRef<CameraRef>(null)
  const hasFitOnceRef = useRef(false)
  // Separate from hasFitOnceRef: the very first placement can land on a
  // trip-bounds fit instead of the driver (see below) when trips exist but
  // no GPS fix has arrived yet — this tracks whether we've actually zoomed
  // in on the driver at least once, so the follow effect can "upgrade" from
  // that wide trip-bounds view the moment a fix does land, instead of only
  // ever panning at whatever zoom the trip-bounds fit happened to pick.
  const hasCenteredOnDriverRef = useRef(false)

  const trips = context?.active_trips ?? []

  // Full pickup AND dropoff for every active trip, regardless of status —
  // this is a spatial overview of the whole day's workload, deliberately
  // NOT the single-point "next stop" logic voice-agent's next_stop.py uses
  // (different purpose: that picks one suggestion, this shows everything).
  // Color assigned by position in active_trips, shared between a trip's own
  // pickup and dropoff.
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

  const allPoints = useMemo(() => {
    const pts: LngLat[] = []
    if (driverPoint) pts.push(driverPoint)
    for (const m of pickupPoints) pts.push(m.point)
    for (const m of dropoffPoints) pts.push(m.point)
    return pts
  }, [driverPoint, pickupPoints, dropoffPoints])

  // Same color-per-trip assignment the pickup/dropoff markers already use
  // (colorForTrip keyed by position in active_trips) — looked up by trip_id
  // instead of by route-stop index so a trip's color matches between the
  // map markers and the route panel's numbered list.
  const colorByTripId = useMemo(() => {
    // Plain object, not the built-in Map class — this file already imports
    // maplibre's <Map> component under that same identifier.
    const byId: Record<string, string> = {}
    trips.forEach((t, i) => { byId[t.trip_id] = colorForTrip(i) })
    return byId
  }, [trips])

  // null whenever there are 0-1 active stops (nothing to order) — see
  // routeOptimizationService.ts on the trip-service side.
  const optimizedRoute = context?.optimized_route ?? null

  // Position (1-based) of each pickup/dropoff marker within the optimized
  // order, so StopMarker can show a number badge — keyed by kind+trip_id
  // since a trip's pickup and dropoff are two separate stops that can each
  // appear (or not) independently in the route.
  const routeOrderByKey = useMemo(() => {
    const byKey: Record<string, number> = {}
    optimizedRoute?.stops.forEach((s, i) => { byKey[`${s.kind}-${s.trip_id}`] = i + 1 })
    return byKey
  }, [optimizedRoute])

  // Road-shaped connector through every stop in optimized order, decoded
  // server-side from real Direction polylines (routeOptimizationService.ts's
  // `path`). Falls back to straight lines between stops only if trip-service
  // couldn't fetch a road path for any hop (path empty) — still better than
  // showing nothing.
  const routeLineGeoJson = useMemo<GeoJSON.Feature<GeoJSON.LineString> | null>(() => {
    if (!optimizedRoute || optimizedRoute.stops.length === 0) return null
    const coords: [number, number][] =
      optimizedRoute.path.length > 0
        ? optimizedRoute.path.map(p => [p.lng, p.lat])
        : [
            ...(driverPoint ? [driverPoint] : []),
            ...optimizedRoute.stops.map(s => [s.lng, s.lat] as [number, number]),
          ]
    if (coords.length < 2) return null
    return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } }
  }, [optimizedRoute, driverPoint])

  const tripIdsKey = trips.map(t => t.trip_id).join(',')
  const hasDriverPoint = driverPoint !== null
  // The one thing that actually proves a NEW GPS reading landed (not just
  // an unchanged 5s poll re-fetch) — driverPoint itself is a fresh array
  // every render even when the coordinates haven't changed, so it can't be
  // used as an effect dependency directly.
  const driverUpdatedAt = live?.updatedAt ?? context?.current_location?.updated_at ?? null

  // First-ever camera placement: center close on the driver if we already
  // have a fix — not a bounds fit across every trip marker, which can leave
  // the driver looking at a zoomed-way-out map if trips are spread far
  // apart. Falls back to fitting whatever trip points exist if there's no
  // GPS fix yet, and to the static default center if there's nothing at all.
  useEffect(() => {
    if (hasFitOnceRef.current) return
    if (driverPoint) {
      cameraRef.current?.easeTo({ center: driverPoint, zoom: DRIVER_INITIAL_ZOOM, duration: 0 })
      hasFitOnceRef.current = true
      hasCenteredOnDriverRef.current = true
    } else if (allPoints.length > 0) {
      const bounds = boundsFromPoints(allPoints)
      if (bounds) cameraRef.current?.fitBounds(bounds, { padding: FIT_PADDING, duration: 0 })
      hasFitOnceRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDriverPoint, tripIdsKey])

  // Follows the driver's live position after the initial placement — this
  // was missing entirely before: the camera only ever got positioned once,
  // so a GPS move (e.g. via the fake-gps testing tool) updated the marker's
  // coordinate fine (Marker just reflects the `lngLat` prop) but nothing
  // panned the map to keep up, so the driver could easily end up off-screen
  // and look like the map "isn't updating" even though it was. Keyed on
  // `updated_at`, not on every poll tick, so this only actually moves the
  // camera when a genuinely new reading lands.
  useEffect(() => {
    if (!hasFitOnceRef.current || !driverPoint) return
    if (!hasCenteredOnDriverRef.current) {
      // First real fix arriving after the initial placement already fell
      // back to a trip-bounds view (no GPS yet at that point) — zoom in on
      // the driver now instead of just panning at whatever wide zoom the
      // bounds fit picked.
      cameraRef.current?.easeTo({ center: driverPoint, zoom: DRIVER_INITIAL_ZOOM, duration: 800 })
      hasCenteredOnDriverRef.current = true
      return
    }
    cameraRef.current?.easeTo({ center: driverPoint, duration: 800 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverUpdatedAt])

  // Re-fits when the SET of trips changes — not on every 5s poll tick, and
  // not fighting the driver-follow effect above (same "already placed once"
  // guard) — a driver manually panning/zooming shouldn't get yanked back on
  // an unrelated poll either.
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

  return (
    <View style={StyleSheet.absoluteFill}>
      <Map style={{ flex: 1 }} mapStyle={GOONG_STYLE_URL} logo={false}>
        <Camera ref={cameraRef} initialViewState={{ center: driverPoint ?? DEFAULT_CENTER, zoom: DEFAULT_ZOOM }} />

        {routeLineGeoJson && (
          <GeoJSONSource id="optimized-route-source" data={routeLineGeoJson}>
            <Layer
              id="optimized-route-line"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': DRIVER_COLOR, 'line-width': 3, 'line-dasharray': [1, 1.5], 'line-opacity': 0.85 }}
            />
          </GeoJSONSource>
        )}

        {driverPoint && (
          <Marker id="driver" lngLat={driverPoint}>
            <DriverMarker />
          </Marker>
        )}
        {pickupPoints.map(({ trip, point, color }) => (
          <Marker key={`pickup-${trip.trip_id}`} id={`pickup-${trip.trip_id}`} lngLat={point} anchor="bottom">
            <StopMarker kind="pickup" name={trip.customer_name || 'Khách'} color={color} order={routeOrderByKey[`pickup-${trip.trip_id}`]} />
          </Marker>
        ))}
        {dropoffPoints.map(({ trip, point, color }) => (
          <Marker key={`dropoff-${trip.trip_id}`} id={`dropoff-${trip.trip_id}`} lngLat={point} anchor="bottom">
            <StopMarker kind="dropoff" name={trip.customer_name || 'Khách'} color={color} order={routeOrderByKey[`dropoff-${trip.trip_id}`]} />
          </Marker>
        ))}
      </Map>

      {optimizedRoute && (
        <OptimizedRoutePanel
          route={optimizedRoute}
          colorForTripId={tripId => colorByTripId[tripId] ?? DRIVER_COLOR}
        />
      )}
    </View>
  )
}
