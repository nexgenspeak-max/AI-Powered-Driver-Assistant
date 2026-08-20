import { useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View, Text, Image, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Map, Camera, Marker, GeoJSONSource, Layer, type LngLat, type LngLatBounds, type CameraRef } from '@maplibre/maplibre-react-native'
import { useDriverContext } from '../../dashboard/hooks/useDriverContext'
import { useLiveDriverLocation } from '../hooks/useLiveDriverLocation'
import { useTurnByTurnNavigation } from '../hooks/useTurnByTurnNavigation'
import { OptimizedRoutePanel } from './OptimizedRoutePanel'
import { NavigationHud } from './NavigationHud'
import { decodePolyline } from '../../../utils/polyline'
import { MAP_OVERLAY_BOTTOM_CLEARANCE } from '../../../constants'
import { pushImmediateLocation } from '../../../services/location/pushImmediateLocation'

// OptimizedRoutePanel's collapsed-state height (header row only) — the
// floating nav button sits just above it when that panel is showing, same
// relative gap as before insets/tab-bar clearance were factored in.
const OPTIMIZED_ROUTE_PANEL_COLLAPSED_HEIGHT = 72

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
// Driving-mode camera: closer + tilted + rotated to heading, like Google
// Maps/Be's navigation view — vs. the flat top-down DRIVER_INITIAL_ZOOM used
// the rest of the time.
const NAV_ZOOM = 17.5
const NAV_PITCH = 45
const NAV_LINE_COLOR = '#2563eb'

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
  const insets = useSafeAreaInsets()
  const { data: context } = useDriverContext()
  // Local GPS stream, updates every few seconds straight off the phone —
  // takes priority over the backend's current_location (only refreshed by
  // the ~10-min proximity ping and possibly several minutes stale even then,
  // see driverContextService.ts) whenever it's available. That backend value
  // is only a fallback for the brief window before this device's own GPS has
  // produced a first fix (e.g. right after opening the app). Also pushes
  // this device's GPS to the backend (throttled) while online, so
  // driverLiveLocationKey/route-optimization always has a real fix instead
  // of depending solely on the background task's ~10-min ping.
  const live = useLiveDriverLocation(context?.driver.status === 'online')

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

  // Where "Bắt đầu chỉ đường" points at: the nearest stop in the optimized
  // multi-stop order when one exists, else the current single trip's
  // pickup/dropoff (mirrors routeOptimizationService.ts's
  // candidatesFromTrips: picked_up -> dropoff, otherwise -> pickup) — covers
  // the one case optimized_route itself comes back null for (exactly one
  // active trip already picked up, nothing left to optimize against).
  const navigationTarget = useMemo(() => {
    if (optimizedRoute?.stops[0]) return { lat: optimizedRoute.stops[0].lat, lng: optimizedRoute.stops[0].lng }
    const trip = context?.current_trip
    if (!trip) return null
    const lat = trip.status === 'picked_up' ? trip.dropoff_lat : trip.pickup_lat
    const lng = trip.status === 'picked_up' ? trip.dropoff_lng : trip.pickup_lng
    return typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null
  }, [optimizedRoute, context?.current_trip])

  const [navActive, setNavActive] = useState(false)
  // Stabilized by value (not a fresh object every render) — useTurnByTurn
  // Navigation's internal effects key off this reference, and DriverMap
  // re-renders on every 5s context poll regardless of whether the GPS fix
  // actually moved.
  const navOrigin = useMemo(() => (live ? { lat: live.lat, lng: live.lng } : null), [live?.lat, live?.lng])
  const nav = useTurnByTurnNavigation(navActive, navOrigin, navigationTarget)
  // Auto-exits once close enough to the target that the driver should be
  // using the "Đã đến điểm đón"/"Đã đón khách" button (ActiveTripCard) to
  // actually progress the trip — the HUD never triggers that status change
  // itself, it's purely a visual/informational overlay.
  useEffect(() => {
    if (navActive && nav.arrived) setNavActive(false)
  }, [navActive, nav.arrived])
  // Also exits if the target the driver was navigating to disappears out
  // from under them (trip cancelled/reassigned mid-navigation, or the whole
  // active-stop set emptied) rather than silently navigating nowhere.
  useEffect(() => {
    if (navActive && !navigationTarget) setNavActive(false)
  }, [navActive, navigationTarget])

  const navRouteGeoJson = useMemo<GeoJSON.Feature<GeoJSON.LineString> | null>(() => {
    if (!navActive || !nav.polyline) return null
    const coords = decodePolyline(nav.polyline).map(p => [p.lng, p.lat] as [number, number])
    if (coords.length < 2) return null
    return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } }
  }, [navActive, nav.polyline])

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
    if (!hasFitOnceRef.current || !driverPoint || navActive) return
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
  }, [driverUpdatedAt, navActive])

  // Re-fits when the SET of trips changes — not on every 5s poll tick, and
  // not fighting the driver-follow effect above (same "already placed once"
  // guard) — a driver manually panning/zooming shouldn't get yanked back on
  // an unrelated poll either. Skipped during navigation — the nav-follow
  // effect below owns the camera then.
  useEffect(() => {
    if (!hasFitOnceRef.current || allPoints.length === 0 || navActive) return
    if (allPoints.length === 1) {
      cameraRef.current?.easeTo({ center: allPoints[0], zoom: SINGLE_POINT_ZOOM, duration: 500 })
    } else {
      const bounds = boundsFromPoints(allPoints)
      if (bounds) cameraRef.current?.fitBounds(bounds, { padding: FIT_PADDING, duration: 500 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripIdsKey, navActive])

  // Driving-mode camera: while navigating, follow the driver tightly with
  // the map rotated to their heading and tilted — like Google Maps/Be's
  // navigation view — instead of the flat north-up follow above. Falls back
  // to no rotation when heading is unknown (stationary/no compass fix yet)
  // rather than snapping to a stale/wrong bearing.
  useEffect(() => {
    if (!navActive || !driverPoint) return
    cameraRef.current?.easeTo({
      center: driverPoint,
      zoom: NAV_ZOOM,
      pitch: NAV_PITCH,
      ...(live?.heading != null ? { bearing: live.heading } : {}),
      duration: 500,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navActive, driverUpdatedAt])

  // Restores the flat top-down view on exit — otherwise the map would stay
  // tilted/rotated from the last nav frame even after leaving nav mode.
  useEffect(() => {
    if (navActive || !driverPoint) return
    cameraRef.current?.easeTo({ center: driverPoint, zoom: DRIVER_INITIAL_ZOOM, pitch: 0, bearing: 0, duration: 500 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navActive])

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* compass={false}: MapLibre's built-in compass control auto-hides at
          bearing 0 (compassHiddenFacingNorth defaults true) but reappears —
          as a plain circular puck, right over the nav HUD — the moment the
          driving-mode camera rotates to heading. We don't offer a
          tap-to-reset-north gesture, so there's no reason to show it. */}
      <Map style={{ flex: 1 }} mapStyle={GOONG_STYLE_URL} logo={false} compass={false}>
        <Camera ref={cameraRef} initialViewState={{ center: driverPoint ?? DEFAULT_CENTER, zoom: DEFAULT_ZOOM }} />

        {!navActive && routeLineGeoJson && (
          <GeoJSONSource id="optimized-route-source" data={routeLineGeoJson}>
            <Layer
              id="optimized-route-line"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': DRIVER_COLOR, 'line-width': 3, 'line-opacity': 0.85 }}
            />
          </GeoJSONSource>
        )}

        {navActive && navRouteGeoJson && (
          <GeoJSONSource id="nav-route-source" data={navRouteGeoJson}>
            <Layer
              id="nav-route-line"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': NAV_LINE_COLOR, 'line-width': 6, 'line-opacity': 0.9 }}
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

      {navActive ? (
        <NavigationHud
          loading={nav.loading}
          error={nav.error}
          step={nav.steps[nav.currentStepIndex] ?? null}
          distanceToManeuverM={nav.distanceToManeuverM}
          remainingKm={nav.remainingKm}
          remainingMin={nav.remainingMin}
          arrived={nav.arrived}
          onExit={() => setNavActive(false)}
          onRefresh={nav.refresh}
        />
      ) : (
        <>
          {optimizedRoute && (
            <OptimizedRoutePanel
              route={optimizedRoute}
              colorForTripId={tripId => colorByTripId[tripId] ?? DRIVER_COLOR}
            />
          )}
          {navigationTarget && (
            <Pressable
              onPress={() => {
                // Same fire-and-forget pattern as accepting a trip
                // (TripCard.tsx/TripOfferBanner.tsx) — pushes a fresh fix to
                // driverLiveLocationKey right as navigation starts, not just
                // used for the from/to steps fetch itself (that call never
                // persists the origin server-side on its own).
                pushImmediateLocation()
                setNavActive(true)
              }}
              style={{
                position: 'absolute',
                right: 16,
                bottom:
                  insets.bottom +
                  MAP_OVERLAY_BOTTOM_CLEARANCE +
                  (optimizedRoute ? OPTIMIZED_ROUTE_PANEL_COLLAPSED_HEIGHT : 0),
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: DRIVER_COLOR,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 5,
              }}
            >
              <Ionicons name="navigate" size={24} color="#ffffff" />
            </Pressable>
          )}
        </>
      )}
    </View>
  )
}
