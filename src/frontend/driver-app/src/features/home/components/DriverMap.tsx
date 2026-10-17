import { useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View, Text, Image } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import {
  Map,
  Camera,
  Marker,
  GeoJSONSource,
  Layer,
  type CameraCenterStop,
  type CameraBoundsStop,
} from '@maplibre/maplibre-react-native'
import { useDriverMapModel } from '../hooks/useDriverMapModel'
import { DriverMapOverlays } from './DriverMapOverlays'
import {
  GOONG_STYLE_URL,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  DRIVER_INITIAL_ZOOM,
  SINGLE_POINT_ZOOM,
  FIT_PADDING,
  NAV_ZOOM,
  NAV_PITCH,
  NAV_LINE_COLOR,
  DRIVER_COLOR,
  boundsFromPoints,
  type LngLat,
} from '../lib/mapConstants'

const DRIVER_VAN_ICON = require('../../../../assets/icons/driver-van.png')

type CameraStopState = CameraCenterStop | CameraBoundsStop

/**
 * Controlled Camera props only — never CameraRef.easeTo / fitBounds.
 * New Architecture + tab freezeOnBlur makes findNodeHandle → MLRNCameraModule
 * reject with "Invalid reactTag … could not find MLRNCamera".
 */

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
      <Text numberOfLines={1} style={{ color: '#ffffff', fontSize: 12, fontWeight: '600' }}>
        {name}
      </Text>
    </View>
  )
}

function centerStop(
  center: LngLat,
  opts: { zoom?: number; pitch?: number; bearing?: number; duration: number },
): CameraCenterStop {
  return {
    center,
    duration: opts.duration,
    easing: 'ease',
    ...(opts.zoom != null ? { zoom: opts.zoom } : {}),
    ...(opts.pitch != null ? { pitch: opts.pitch } : {}),
    ...(opts.bearing != null ? { bearing: opts.bearing } : {}),
  }
}

function fitStops(points: LngLat[], duration: number): CameraStopState | null {
  if (points.length === 0) return null
  if (points.length === 1) {
    return centerStop(points[0], { zoom: SINGLE_POINT_ZOOM, duration })
  }
  const bounds = boundsFromPoints(points)
  if (!bounds) return null
  return {
    bounds,
    padding: FIT_PADDING,
    duration,
    easing: duration === 0 ? 'ease' : 'fly',
  }
}

export function DriverMap() {
  const model = useDriverMapModel()
  const {
    live,
    driverPoint,
    pickupPoints,
    dropoffPoints,
    allPoints,
    navActive,
    navRouteGeoJson,
    routeLineGeoJson,
    routeOrderByKey,
    driverUpdatedAt,
    tripIdsKey,
    recenterTick,
  } = model

  const isFocused = useIsFocused()
  const [cameraStop, setCameraStop] = useState<CameraStopState | null>(null)
  const fittedTripIdsRef = useRef<string | null>(null)
  const wasNavRef = useRef(false)
  /** Skip setState when the camera target is unchanged — prevents update-depth loops. */
  const appliedCamKeyRef = useRef<string>('')

  const initialViewState = useMemo(
    () => ({
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    }),
    [],
  )

  const applyCamera = (stop: CameraStopState, key: string) => {
    if (appliedCamKeyRef.current === key) return
    appliedCamKeyRef.current = key
    setCameraStop(stop)
  }

  // The first real GPS fix wins over any earlier fit-to-trips: a driver with
  // a long schedule (stops across several provinces) opened to a map of the
  // whole country instead of the streets around them.
  const centeredOnDriverRef = useRef(false)
  useEffect(() => {
    if (!isFocused || navActive || !driverPoint || centeredOnDriverRef.current) return
    centeredOnDriverRef.current = true
    applyCamera(
      centerStop(driverPoint, { zoom: DRIVER_INITIAL_ZOOM, duration: 600 }),
      `first-fix:${driverPoint[0].toFixed(5)},${driverPoint[1].toFixed(5)}`,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverPoint, isFocused])

  // One-shot "my location": keyed on the tick, not the coordinates, so each
  // tap re-centers even when the driver hasn't moved since the last one.
  useEffect(() => {
    if (!isFocused || recenterTick === 0 || !driverPoint) return
    applyCamera(
      centerStop(driverPoint, { zoom: navActive ? NAV_ZOOM : DRIVER_INITIAL_ZOOM, duration: 400 }),
      `recenter:${recenterTick}`,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterTick])

  useEffect(() => {
    if (!isFocused) return

    if (navActive && driverPoint) {
      wasNavRef.current = true
      const bearing = live?.heading ?? 0
      applyCamera(
        centerStop(driverPoint, {
          zoom: NAV_ZOOM,
          pitch: NAV_PITCH,
          bearing,
          duration: 500,
        }),
        `nav:${driverPoint[0].toFixed(5)},${driverPoint[1].toFixed(5)},${bearing.toFixed(0)}`,
      )
      return
    }

    if (wasNavRef.current) {
      wasNavRef.current = false
      if (driverPoint) {
        applyCamera(
          centerStop(driverPoint, {
            zoom: DRIVER_INITIAL_ZOOM,
            pitch: 0,
            bearing: 0,
            duration: 500,
          }),
          `nav-exit:${driverPoint[0].toFixed(5)},${driverPoint[1].toFixed(5)}`,
        )
      }
      return
    }

    const tripsChanged = fittedTripIdsRef.current !== tripIdsKey
    if (tripsChanged && allPoints.length > 0) {
      const isFirst = fittedTripIdsRef.current == null
      fittedTripIdsRef.current = tripIdsKey
      if (driverPoint) {
        // With a GPS fix the streets around the driver are the view that
        // matters. Fitting every stop on each schedule change zoomed a
        // driver with cross-province trips out to a map of the whole
        // country every time the list refreshed.
        if (isFirst) {
          applyCamera(
            centerStop(driverPoint, { zoom: DRIVER_INITIAL_ZOOM, duration: 0 }),
            `init:${tripIdsKey}:${driverPoint[0].toFixed(5)},${driverPoint[1].toFixed(5)}`,
          )
        }
      } else {
        const stop = fitStops(allPoints, isFirst ? 0 : 500)
        if (stop) applyCamera(stop, `fit:${tripIdsKey}`)
      }
      return
    }

    if (fittedTripIdsRef.current == null && driverPoint) {
      fittedTripIdsRef.current = tripIdsKey
      applyCamera(
        centerStop(driverPoint, { zoom: DRIVER_INITIAL_ZOOM, duration: 0 }),
        `init:${tripIdsKey}:${driverPoint[0].toFixed(5)},${driverPoint[1].toFixed(5)}`,
      )
      return
    }

    // Follow driver only when GPS timestamp / coords actually move — never
    // setCameraStop on every effect tick (Maximum update depth).
    if (driverPoint && fittedTripIdsRef.current != null && driverUpdatedAt != null) {
      applyCamera(
        centerStop(driverPoint, { duration: 800 }),
        `follow:${driverPoint[0].toFixed(5)},${driverPoint[1].toFixed(5)}`,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, navActive, driverUpdatedAt, tripIdsKey, live?.heading])

  return (
    <View style={StyleSheet.absoluteFill}>
      <Map style={{ flex: 1 }} mapStyle={GOONG_STYLE_URL} logo={false} compass={false}>
        <Camera initialViewState={initialViewState} {...(cameraStop ?? {})} />

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

      <DriverMapOverlays model={model} />
    </View>
  )
}
