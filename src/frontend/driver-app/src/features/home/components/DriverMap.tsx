import { useEffect, useRef } from 'react'
import { StyleSheet, View, Text, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Map, Camera, Marker, GeoJSONSource, Layer, type CameraRef } from '@maplibre/maplibre-react-native'
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
} from '../lib/mapConstants'

const DRIVER_VAN_ICON = require('../../../../assets/icons/driver-van.png')

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
    hasDriverPoint,
  } = model

  const cameraRef = useRef<CameraRef>(null)
  const hasFitOnceRef = useRef(false)
  const hasCenteredOnDriverRef = useRef(false)

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

  useEffect(() => {
    if (!hasFitOnceRef.current || !driverPoint || navActive) return
    if (!hasCenteredOnDriverRef.current) {
      cameraRef.current?.easeTo({ center: driverPoint, zoom: DRIVER_INITIAL_ZOOM, duration: 800 })
      hasCenteredOnDriverRef.current = true
      return
    }
    cameraRef.current?.easeTo({ center: driverPoint, duration: 800 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverUpdatedAt, navActive])

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

  useEffect(() => {
    if (navActive || !driverPoint) return
    cameraRef.current?.easeTo({ center: driverPoint, zoom: DRIVER_INITIAL_ZOOM, pitch: 0, bearing: 0, duration: 500 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navActive])

  return (
    <View style={StyleSheet.absoluteFill}>
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

      <DriverMapOverlays model={model} />
    </View>
  )
}
