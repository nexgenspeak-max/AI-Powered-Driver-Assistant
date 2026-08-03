import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

// Same wss://.../ws?role=driver&id=<phone> protocol on both environments —
// see trip-service's notify/local.ts (dev, plain `ws`) and
// notify/lambda.ts + handlers/websocketConnect.ts (deployed, API Gateway
// WebSocket) — the query-string identification is identical either way.
const WS_URL = process.env.EXPO_PUBLIC_TRIP_SERVICE_WS_URL ?? 'ws://localhost:8002/ws'

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
          if (msg.event === 'trip_offer' || msg.event === 'no_driver_found') {
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
