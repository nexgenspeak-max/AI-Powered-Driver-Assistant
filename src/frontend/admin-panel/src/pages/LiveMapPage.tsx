import { useEffect, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// Vite pre-bundling breaks maplibre's import.meta.url worker lookup, so bundle the worker ourselves.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { Alert, Box, Typography } from '@mui/material'
import { driversService, type DriverLocation } from '../services/api/drivers'
import { useTrips } from '../features/trips/hooks/useTrips'
import { DISPATCHABLE_STATUSES, normalizeTripStatus } from '../constants/status'
import { useAdminContent } from '../i18n/useAdminContent'
import { SettingsPanel } from '../layouts/SettingsPanel'
import { InitialsAvatar, StatusPill } from '../components/StatusPill'
import { PALETTE } from '../styles/palette'
import type { Trip } from '../types'

maplibregl.setWorkerUrl(workerUrl)

const KEY = import.meta.env.VITE_GOONG_MAPS_KEY as string | undefined
const STYLE = `https://tiles.goong.io/assets/goong_map_dark.json?api_key=${KEY ?? ''}`
const HANOI: [number, number] = [105.8342, 21.0278]

function hhmm(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function driverEl(d: DriverLocation): HTMLElement {
  const color = d.status === 'online' ? PALETTE.success : PALETTE.shellMuted
  const el = document.createElement('div')
  el.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer'
  el.innerHTML = `
    <div style="width:34px;height:34px;border-radius:50%;background:#0f0c1c;border:2px solid ${color};display:grid;place-items:center;box-shadow:0 0 0 6px ${color}33">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="${color}"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
    </div>
    <div style="padding:2px 8px;border-radius:999px;background:#0f0c1ccc;border:1px solid ${color}55;color:#f4f2fb;font:600 12px Inter,sans-serif;white-space:nowrap">${d.name}</div>`
  return el
}

function pickupEl(t: Trip): HTMLElement {
  const el = document.createElement('div')
  el.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer'
  el.innerHTML = `
    <div style="padding:3px 9px;border-radius:999px;background:${PALETTE.warning};color:#1f1a2e;font:700 12px Inter,sans-serif;white-space:nowrap;box-shadow:0 4px 14px #0008">${t.customer_name || '—'}</div>
    <div style="width:2px;height:10px;background:${PALETTE.warning}"></div>
    <div style="width:10px;height:10px;border-radius:50%;background:${PALETTE.warning};box-shadow:0 0 0 5px ${PALETTE.warning}40"></div>`
  return el
}

/** Dispatcher live map: drivers' latest GPS fixes and pickups still waiting for a driver. */
export default function LiveMapPage() {
  const { c } = useAdminContent()
  const m = c.map
  const box = useRef<HTMLDivElement | null>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])
  const fitted = useRef(false)

  const { data: drivers = [], isSuccess: driversReady } = useQuery({ queryKey: ['driver-locations'], queryFn: driversService.locations, refetchInterval: 10000 })
  const { data: trips = [], isSuccess: tripsReady } = useTrips()
  const waiting = useMemo(
    () => trips.filter(t => DISPATCHABLE_STATUSES.includes(normalizeTripStatus(t.status)) && typeof t.pickup_lat === 'number' && typeof t.pickup_lng === 'number'),
    [trips],
  )

  useEffect(() => {
    if (!box.current || map.current || !KEY) return
    map.current = new maplibregl.Map({ container: box.current, style: STYLE, center: HANOI, zoom: 12, attributionControl: { compact: true } })
    map.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    return () => { map.current?.remove(); map.current = null }
  }, [])

  useEffect(() => {
    const mp = map.current
    if (!mp) return
    markers.current.forEach(mk => mk.remove())
    markers.current = [
      ...drivers.map(d => new maplibregl.Marker({ element: driverEl(d), anchor: 'top' }).setLngLat([d.lng, d.lat]).addTo(mp)),
      ...waiting.map(t => new maplibregl.Marker({ element: pickupEl(t), anchor: 'bottom' }).setLngLat([t.pickup_lng!, t.pickup_lat!]).addTo(mp)),
    ]
    const pts: [number, number][] = [...drivers.map(d => [d.lng, d.lat] as [number, number]), ...waiting.map(t => [t.pickup_lng!, t.pickup_lat!] as [number, number])]
    if (!fitted.current && driversReady && tripsReady && pts.length) {
      fitted.current = true
      if (pts.length === 1) mp.jumpTo({ center: pts[0], zoom: 14 })
      else mp.fitBounds(pts.reduce((b, p) => b.extend(p), new maplibregl.LngLatBounds(pts[0], pts[0])), { padding: 80, maxZoom: 14, duration: 0 })
    }
  }, [drivers, waiting, driversReady, tripsReady])

  const fly = (lng: number, lat: number) => map.current?.flyTo({ center: [lng, lat], zoom: 15 })
  const sectionTitle = (t: string, n: number) => (
    <Typography sx={{ px: 2, pt: 2, pb: 1, fontSize: 12, fontWeight: 700, color: PALETTE.light, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {t} · {n}
    </Typography>
  )

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1fr) 320px' }, gap: 2, height: { lg: 'calc(100dvh - 210px)' }, minHeight: 520 }}>
      <SettingsPanel sx={{ position: 'relative', minHeight: 420 }}>
        {KEY ? <Box sx={{ position: 'absolute', inset: 0 }}><Box ref={box} sx={{ width: '100%', height: '100%' }} /></Box> : <Alert severity="info" sx={{ m: 2 }}>{m.noKey}</Alert>}
      </SettingsPanel>
      <SettingsPanel sx={{ overflowY: 'auto' }}>
        {sectionTitle(m.drivers, drivers.length)}
        {drivers.length === 0 ? <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>{m.noDrivers}</Typography> : null}
        {drivers.map(d => (
          <Box key={d.phone} onClick={() => fly(d.lng, d.lat)} sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.25, cursor: 'pointer', '&:hover': { bgcolor: PALETTE.shellNavHover } }}>
            <InitialsAvatar name={d.name} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{d.name}</Typography>
              <Typography variant="caption" color="text.secondary">{d.phone} · {m.seen(hhmm(d.updated_at))}</Typography>
            </Box>
            <StatusPill label={d.status === 'online' ? c.common.online : c.common.offline} tone={d.status === 'online' ? 'success' : 'default'} />
          </Box>
        ))}
        {sectionTitle(m.waiting, waiting.length)}
        {waiting.length === 0 ? <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>{m.noWaiting}</Typography> : null}
        {waiting.map(t => (
          <Box key={t.trip_id} onClick={() => fly(t.pickup_lng!, t.pickup_lat!)} sx={{ px: 2, py: 1.25, cursor: 'pointer', '&:hover': { bgcolor: PALETTE.shellNavHover } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PALETTE.warning, flexShrink: 0 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{t.customer_name || '—'}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>{t.pickup_time && !t.pickup_time.includes('T') ? t.pickup_time : ''}</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', pl: 2 }}>{t.pickup_address}</Typography>
          </Box>
        ))}
      </SettingsPanel>
    </Box>
  )
}
