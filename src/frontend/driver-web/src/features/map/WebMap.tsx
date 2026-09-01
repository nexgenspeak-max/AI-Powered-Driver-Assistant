import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Box, Typography } from '@mui/material'
import { DEFAULT_CENTER, DEFAULT_ZOOM, GOONG_MAPS_KEY, GOONG_STYLE_URL } from './mapConstants'

export type MapMarker = {
  lngLat: [number, number]
  label: string
  color: string
}

type WebMapProps = {
  markers: MapMarker[]
  height?: number | string
  emptyMessage?: string
}

export default function WebMap({ markers, height = 360, emptyMessage }: WebMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRefs = useRef<maplibregl.Marker[]>([])

  useEffect(() => {
    if (!GOONG_MAPS_KEY || !containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: GOONG_STYLE_URL,
      center: markers[0]?.lngLat ?? DEFAULT_CENTER,
      zoom: markers.length ? 13 : DEFAULT_ZOOM,
      attributionControl: false,
    })
    mapRef.current = map
    return () => {
      markerRefs.current.forEach(m => m.remove())
      markerRefs.current = []
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const apply = () => {
      markerRefs.current.forEach(m => m.remove())
      markerRefs.current = []

      for (const m of markers) {
        const el = document.createElement('div')
        el.style.cssText = [
          'background:' + m.color,
          'color:#fff',
          'font:600 11px/1.2 system-ui,sans-serif',
          'padding:4px 8px',
          'border-radius:12px',
          'border:1.5px solid #fff',
          'max-width:140px',
          'white-space:nowrap',
          'overflow:hidden',
          'text-overflow:ellipsis',
        ].join(';')
        el.textContent = m.label
        markerRefs.current.push(
          new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(m.lngLat).addTo(map),
        )
      }

      if (markers.length === 1) {
        map.easeTo({ center: markers[0].lngLat, zoom: 14, duration: 500 })
      } else if (markers.length > 1) {
        const bounds = new maplibregl.LngLatBounds()
        markers.forEach(m => bounds.extend(m.lngLat))
        map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 500 })
      }
    }

    if (map.isStyleLoaded()) apply()
    else map.once('load', apply)
  }, [markers])

  if (!GOONG_MAPS_KEY) {
    return (
      <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover', borderRadius: 3, p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Thêm <code>VITE_GOONG_MAPS_KEY</code> vào file .env để hiển thị bản đồ.
        </Typography>
      </Box>
    )
  }

  if (markers.length === 0 && emptyMessage) {
    return (
      <Box sx={{ position: 'relative', height, borderRadius: 3, overflow: 'hidden' }}>
        <Box ref={containerRef} sx={{ position: 'absolute', inset: 0 }} />
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.35)' }}>
          <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>{emptyMessage}</Typography>
        </Box>
      </Box>
    )
  }

  return <Box ref={containerRef} sx={{ height, borderRadius: 3, overflow: 'hidden' }} />
}
