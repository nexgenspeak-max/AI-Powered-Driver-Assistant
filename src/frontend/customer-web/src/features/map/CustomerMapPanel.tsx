import { useMemo } from 'react'
import WebMap, { type MapMarker } from './WebMap'
import { useCustomerContext } from '../home/hooks/useCustomerContext'
import { colorForTrip, DRIVER_COLOR } from './mapConstants'

export default function CustomerMapPanel() {
  const { data: context } = useCustomerContext()

  const markers = useMemo(() => {
    const out: MapMarker[] = []
    const dl = context?.driver_location
    if (dl?.lat && dl?.lng) {
      out.push({ lngLat: [dl.lng, dl.lat], label: 'Tài xế', color: DRIVER_COLOR })
    }
    ;(context?.active_trips ?? []).forEach((trip, i) => {
      const color = colorForTrip(i)
      if (trip.pickup_lng != null && trip.pickup_lat != null) {
        out.push({ lngLat: [trip.pickup_lng, trip.pickup_lat], label: 'Điểm đón', color })
      }
      if (trip.dropoff_lng != null && trip.dropoff_lat != null) {
        out.push({ lngLat: [trip.dropoff_lng, trip.dropoff_lat], label: 'Điểm đến', color })
      }
    })
    return out
  }, [context])

  return (
    <WebMap
      markers={markers}
      height={380}
      emptyMessage={markers.length === 0 ? 'Đặt chuyến để xem trên bản đồ' : undefined}
    />
  )
}
