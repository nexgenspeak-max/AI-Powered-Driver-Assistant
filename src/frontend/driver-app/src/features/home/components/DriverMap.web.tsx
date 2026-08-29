import { createElement, useEffect, useRef } from 'react'
import { StyleSheet, View, Text } from 'react-native'
import maplibregl from 'maplibre-gl'
import { useDriverMapModel } from '../hooks/useDriverMapModel'
import { DriverMapOverlays } from './DriverMapOverlays'
import {
  GOONG_MAPS_KEY,
  GOONG_STYLE_URL,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  DRIVER_INITIAL_ZOOM,
  NAV_ZOOM,
  NAV_PITCH,
  NAV_LINE_COLOR,
  DRIVER_COLOR,
} from '../lib/mapConstants'

const MAPLIBRE_CSS = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css'

function ensureMapLibreCss() {
  if (typeof document === 'undefined') return
  if (document.getElementById('maplibre-gl-css')) return
  const link = document.createElement('link')
  link.id = 'maplibre-gl-css'
  link.rel = 'stylesheet'
  link.href = MAPLIBRE_CSS
  document.head.appendChild(link)
}

function markerEl(label: string, color: string): HTMLDivElement {
  const el = document.createElement('div')
  el.style.cssText = [
    'display:flex',
    'align-items:center',
    'gap:4px',
    `background:${color}`,
    'color:#fff',
    'font:600 12px/1.2 system-ui,sans-serif',
    'padding:4px 8px',
    'border-radius:12px',
    'border:1.5px solid #fff',
    'max-width:140px',
    'white-space:nowrap',
    'overflow:hidden',
    'text-overflow:ellipsis',
  ].join(';')
  el.textContent = label
  return el
}

export function DriverMap() {
  const model = useDriverMapModel()
  const {
    live,
    driverPoint,
    pickupPoints,
    dropoffPoints,
    navActive,
    navRouteGeoJson,
    routeLineGeoJson,
    driverUpdatedAt,
  } = model

  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])

  useEffect(() => {
    if (!GOONG_MAPS_KEY || !containerRef.current || mapRef.current) return
    ensureMapLibreCss()
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: GOONG_STYLE_URL,
      center: driverPoint ?? DEFAULT_CENTER,
      zoom: driverPoint ? DRIVER_INITIAL_ZOOM : DEFAULT_ZOOM,
      attributionControl: false,
    })
    mapRef.current = map
    return () => {
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
    }
    // Mount once — camera/markers sync in the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const setLine = (
      id: string,
      data: { type: 'Feature'; properties: object; geometry: { type: 'LineString'; coordinates: number[][] } } | null,
      color: string,
      width: number,
    ) => {
      if (map.getLayer(id)) map.removeLayer(id)
      if (map.getSource(id)) map.removeSource(id)
      if (!data) return
      map.addSource(id, { type: 'geojson', data })
      map.addLayer({
        id,
        type: 'line',
        source: id,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': color, 'line-width': width, 'line-opacity': 0.9 },
      })
    }

    const apply = () => {
      setLine('optimized-route-line', navActive ? null : routeLineGeoJson, DRIVER_COLOR, 3)
      setLine('nav-route-line', navActive ? navRouteGeoJson : null, NAV_LINE_COLOR, 6)
    }
    if (map.isStyleLoaded()) apply()
    else map.once('load', apply)
  }, [navActive, routeLineGeoJson, navRouteGeoJson, driverUpdatedAt])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    if (driverPoint) {
      markersRef.current.push(
        new maplibregl.Marker({ element: markerEl('Tài xế', DRIVER_COLOR), anchor: 'bottom' })
          .setLngLat(driverPoint)
          .addTo(map),
      )
    }
    for (const { trip, point, color } of pickupPoints) {
      markersRef.current.push(
        new maplibregl.Marker({ element: markerEl(`Đón ${trip.customer_name || 'khách'}`, color), anchor: 'bottom' })
          .setLngLat(point)
          .addTo(map),
      )
    }
    for (const { trip, point, color } of dropoffPoints) {
      markersRef.current.push(
        new maplibregl.Marker({ element: markerEl(`Trả ${trip.customer_name || 'khách'}`, color), anchor: 'bottom' })
          .setLngLat(point)
          .addTo(map),
      )
    }
  }, [driverPoint, pickupPoints, dropoffPoints])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !driverPoint) return
    if (navActive) {
      map.easeTo({
        center: driverPoint,
        zoom: NAV_ZOOM,
        pitch: NAV_PITCH,
        bearing: live?.heading ?? 0,
        duration: 500,
      })
      return
    }
    map.easeTo({ center: driverPoint, zoom: DRIVER_INITIAL_ZOOM, pitch: 0, bearing: 0, duration: 500 })
  }, [driverUpdatedAt, navActive, driverPoint, live?.heading])

  if (!GOONG_MAPS_KEY) {
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Thiếu EXPO_PUBLIC_GOONG_MAPS_KEY</Text>
        <Text style={styles.subtitle}>Thêm Maptiles Key vào driver-app/.env rồi restart Metro.</Text>
      </View>
    )
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      {createElement('div', {
        ref: containerRef,
        style: { position: 'absolute', inset: 0 },
        'data-testid': 'driver-map-web',
      })}
      <DriverMapOverlays model={model} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    padding: 24,
  },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  subtitle: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
})
