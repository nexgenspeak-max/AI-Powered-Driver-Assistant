import { useEffect, useRef } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useTripOfferStore } from '../../../stores/tripOfferStore'
import { pushImmediateLocation } from '../../../services/location/pushImmediateLocation'
import { devlog } from '../../../services/devlog'

// Same wss://.../ws?role=driver&id=<phone> protocol on both environments —
// see trip-service's notify/local.ts (dev, plain `ws`) and
// notify/lambda.ts + handlers/websocketConnect.ts (deployed, API Gateway
// WebSocket) — the query-string identification is identical either way.
//
// Derived from EXPO_PUBLIC_TRIP_SERVICE_URL (the REST base URL, used by
// apiClient.ts) rather than needing its own separately-configured env var:
// a literal "localhost" fallback here works fine on web (same machine as
// the dev server) but silently never connects on a real device — the
// phone's own "localhost" isn't the dev machine's. REST calls kept working
// there because EXPO_PUBLIC_TRIP_SERVICE_URL gets set to the dev machine's
// LAN IP; this failed only because EXPO_PUBLIC_TRIP_SERVICE_WS_URL is a
// second, easy-to-forget variable that has to be kept in sync with it.
// EXPO_PUBLIC_TRIP_SERVICE_WS_URL is still honored first for deployed
// builds, where the WS endpoint (API Gateway) is a genuinely different
// host/protocol than the REST API, not just http->ws on the same host.
function deriveWsUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_TRIP_SERVICE_WS_URL
  if (explicit) return explicit
  const restBase = process.env.EXPO_PUBLIC_EXTERNAL_API_SERVICE_URL ?? process.env.EXPO_PUBLIC_TRIP_SERVICE_URL ?? 'http://localhost:8002/api/v1'
  return restBase.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '') + '/ws'
}
const WS_URL = deriveWsUrl()

const RECONNECT_DELAY_MS = 3000

function invalidateDriverQueries(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['driverContext'] })
  qc.invalidateQueries({ queryKey: ['trip-offer'] })
}

// Live path for trip offers / schedule / pending nudges. GET /me/context
// runs once on mount and again when this socket opens or an event lands —
// no interval poll (REST and WS share the trip-service process).
export function useDispatchSocket(isOnline: boolean, driverPhone: string | undefined): void {
  const qc = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!isOnline || !driverPhone) {
      wsRef.current?.close()
      wsRef.current = null
      return
    }

    let cancelled = false
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      if (cancelled) return
      const openedAt = Date.now()
      const ws = new WebSocket(`${WS_URL}?role=driver&id=${encodeURIComponent(driverPhone)}`)
      wsRef.current = ws

      ws.onopen = () => {
        if (cancelled) return
        invalidateDriverQueries(qc)
        devlog.event('dispatch_ws', { ok: true, state: 'open', duration_ms: Date.now() - openedAt })
      }

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string)
          if (msg.event === 'trip_offer') {
            invalidateDriverQueries(qc)
            // Surfaces the floating accept/reject banner (TripOfferSheet.tsx)
            // immediately, regardless of which tab the driver is currently on
            // — the dashboard's own TripCard list is still the fallback
            // (visible once they open Dashboard), this just makes it
            // impossible to miss.
            if (msg.data?.trip_id) useTripOfferStore.getState().show(msg.data.trip_id)
          }
          // Pushed by trip-service's PATCH /trips/:id the instant a trip
          // (this driver's, via the app button OR voice-agent's
          // confirm_trip) becomes confirmed — fires the same fresh-GPS push
          // TripCard/TripOfferSheet already do on tap, so a
          // voice-confirmed trip gets the same near-zero-latency treatment.
          if (msg.event === 'trip_confirmed') {
            pushImmediateLocation()
          }
          // Pushed after any PATCH that changes this driver's schedule
          // (cancel, reject, progress, …) and after POST /me/location/live
          // rebuilds the optimized route.
          if (msg.event === 'schedule_updated' || msg.event === 'pending_nudge') {
            invalidateDriverQueries(qc)
          }
        } catch {
          // Malformed message — ignore, don't drop the connection over it.
        }
      }

      ws.onclose = () => {
        if (!cancelled) reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
      }

      ws.onerror = () => ws.close()
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [isOnline, driverPhone, qc])
}
