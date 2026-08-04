import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTripNotificationStore, type TripNotificationEvent } from '../../../stores/tripNotificationStore'

// Same wss://.../ws?role=customer&id=<id_account> protocol driver-app uses
// (role=driver) — see trip-service's notify/local.ts (dev, plain `ws`) and
// notify/lambda.ts (deployed, API Gateway WebSocket).
const WS_URL = process.env.EXPO_PUBLIC_TRIP_SERVICE_WS_URL ?? 'ws://localhost:8002/ws'

const RECONNECT_DELAY_MS = 3000

// Real-time nudge for "the driver you picked answered" (trip_confirmed /
// trip_rejected — see trip-service's PATCH /:tripId) — purely an
// optimization on top of the existing 10s poll (useTripStatus.ts), which
// stays the source of truth. If the socket never connects or keeps
// dropping, the trip status screen still catches up within 10s.
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

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string)
          const event: TripNotificationEvent | undefined =
            msg.event === 'trip_confirmed' || msg.event === 'trip_rejected' ? msg.event : undefined
          if (event && msg.data?.trip_id) {
            qc.invalidateQueries({ queryKey: ['trip', msg.data.trip_id] })
            useTripNotificationStore.getState().show({ tripId: msg.data.trip_id, event })
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
