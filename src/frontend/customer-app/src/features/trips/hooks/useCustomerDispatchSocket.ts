import { useEffect, useRef } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useTripNotificationStore, type TripNotificationEvent } from '../../../stores/tripNotificationStore'

// Same wss://.../ws?role=customer&id=<id_account> protocol driver-app uses
// (role=driver) — see trip-service's notify/local.ts (dev, plain `ws`) and
// notify/lambda.ts (deployed, API Gateway WebSocket).
//
// Derived from EXPO_PUBLIC_TRIP_SERVICE_URL the same way driver-app does:
// a hardcoded localhost fallback never connects on a real phone.
function deriveWsUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_TRIP_SERVICE_WS_URL
  if (explicit) return explicit
  const restBase = process.env.EXPO_PUBLIC_EXTERNAL_API_SERVICE_URL ?? process.env.EXPO_PUBLIC_TRIP_SERVICE_URL ?? 'http://localhost:8002/api/v1'
  return restBase.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '') + '/ws'
}
const WS_URL = deriveWsUrl()

const RECONNECT_DELAY_MS = 3000

function invalidateCustomerQueries(qc: QueryClient, tripId?: string) {
  qc.invalidateQueries({ queryKey: ['customerContext'] })
  if (tripId) {
    qc.invalidateQueries({ queryKey: ['trip', tripId] })
  } else {
    qc.invalidateQueries({ queryKey: ['trip'] })
  }
}

// Live path for trip status / driver location. GET runs on mount and when
// this socket opens or an event lands — no interval poll.
export function useCustomerDispatchSocket(customerId: string | undefined): void {
  const qc = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!customerId) {
      wsRef.current?.close()
      wsRef.current = null
      return
    }

    let cancelled = false
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      if (cancelled) return
      const ws = new WebSocket(`${WS_URL}?role=customer&id=${encodeURIComponent(customerId)}`)
      wsRef.current = ws

      ws.onopen = () => {
        if (cancelled) return
        invalidateCustomerQueries(qc)
      }

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string)
          const tripId = typeof msg.data?.trip_id === 'string' ? msg.data.trip_id : undefined
          const bannerEvent: TripNotificationEvent | undefined =
            msg.event === 'trip_confirmed' || msg.event === 'trip_rejected' ? msg.event : undefined
          if (bannerEvent && tripId) {
            invalidateCustomerQueries(qc, tripId)
            useTripNotificationStore.getState().show({ tripId, event: bannerEvent })
            return
          }
          if (msg.event === 'trip_updated' || msg.event === 'driver_location') {
            invalidateCustomerQueries(qc, tripId)
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
  }, [customerId, qc])
}
