import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTripOfferStore } from '../../../stores/tripOfferStore'
import { pushImmediateLocation } from '../../../services/location/pushImmediateLocation'

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
  const restBase = process.env.EXPO_PUBLIC_TRIP_SERVICE_URL ?? 'http://localhost:8002/api/v1'
  return restBase.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '') + '/ws'
}
const WS_URL = deriveWsUrl()

const RECONNECT_DELAY_MS = 3000

// Real-time nudge for new/escalated trip offers — purely an optimization on
// top of the existing 5s poll (useDriverContext.ts), which stays the source
// of truth. If the socket never connects or keeps dropping, the driver still
// sees new offers within 5s via polling — this just makes it near-instant
// when it works.
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
      const ws = new WebSocket(`${WS_URL}?role=driver&id=${encodeURIComponent(driverPhone)}`)
      wsRef.current = ws

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string)
          if (msg.event === 'trip_offer') {
            qc.invalidateQueries({ queryKey: ['driverContext'] })
            // Surfaces the floating accept/reject banner (TripOfferBanner.tsx)
            // immediately, regardless of which tab the driver is currently on
            // — the dashboard's own TripCard list is still the fallback
            // (visible once they open Dashboard), this just makes it
            // impossible to miss.
            if (msg.data?.trip_id) useTripOfferStore.getState().show(msg.data.trip_id)
          }
          // Pushed by trip-service's PATCH /trips/:id the instant a trip
          // (this driver's, via the app button OR voice-agent's
          // confirm_trip) becomes confirmed — fires the same fresh-GPS push
          // TripCard/TripOfferBanner already do on tap, so a
          // voice-confirmed trip gets the same near-zero-latency treatment.
          // usePushLocationOnNewTrip.ts's 5s-poll diffing stays as the
          // fallback if this socket message is ever missed/dropped.
          if (msg.event === 'trip_confirmed') {
            pushImmediateLocation()
          }
          // Pushed by POST /drivers/me/location/live once it's rebuilt the
          // optimized route with a fresh fix (see drivers.ts) — refetch now
          // instead of waiting on the 5s poll to pick up the new order.
          if (msg.event === 'schedule_updated') {
            qc.invalidateQueries({ queryKey: ['driverContext'] })
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
