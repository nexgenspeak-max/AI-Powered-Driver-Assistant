import { useEffect, useRef } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useTripNotificationStore, type TripNotificationEvent } from '../../../stores/tripNotificationStore'
import { deriveTripWsUrl } from '../../../utils/wsUrl'

const WS_URL = deriveTripWsUrl()
const RECONNECT_DELAY_MS = 3000

function invalidateCustomerQueries(qc: QueryClient, tripId?: string) {
  qc.invalidateQueries({ queryKey: ['customerContext'] })
  qc.invalidateQueries({ queryKey: ['trip-history'] })
  if (tripId) {
    qc.invalidateQueries({ queryKey: ['trip', tripId] })
  } else {
    qc.invalidateQueries({ queryKey: ['trip'] })
  }
}

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

      ws.onmessage = e => {
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
  }, [customerId, qc])
}
