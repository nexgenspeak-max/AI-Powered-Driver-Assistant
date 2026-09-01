import { useEffect, useRef } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useTripOfferStore } from '../../../stores/tripOfferStore'
import { deriveTripWsUrl } from '../../../utils/wsUrl'

const WS_URL = deriveTripWsUrl()
const RECONNECT_DELAY_MS = 3000

function invalidateDriverQueries(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['driverContext'] })
  qc.invalidateQueries({ queryKey: ['trips', 'driver'] })
}

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

      ws.onopen = () => {
        if (cancelled) return
        invalidateDriverQueries(qc)
      }

      ws.onmessage = e => {
        try {
          const msg = JSON.parse(e.data as string)
          if (msg.event === 'trip_offer') {
            invalidateDriverQueries(qc)
            if (msg.data?.trip_id) useTripOfferStore.getState().show(msg.data.trip_id)
          }
          if (msg.event === 'schedule_updated' || msg.event === 'pending_nudge' || msg.event === 'trip_confirmed') {
            invalidateDriverQueries(qc)
          }
        } catch {
          // ignore malformed
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
