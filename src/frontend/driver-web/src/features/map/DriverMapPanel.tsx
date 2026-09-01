import { useMemo } from 'react'
import WebMap, { type MapMarker } from './WebMap'
import { useDriverContext } from '../dashboard/hooks/useDriverContext'
import { colorForTrip, DRIVER_COLOR } from './mapConstants'

export default function DriverMapPanel() {
  const { data: context } = useDriverContext()

  const markers = useMemo(() => {
    const out: MapMarker[] = []
    const loc = context?.current_location
    if (loc?.lat && loc?.lng) {
      out.push({ lngLat: [loc.lng, loc.lat], label: 'Tài xế', color: DRIVER_COLOR })
    }
    ;(context?.active_trips ?? []).forEach((trip, i) => {
      const color = colorForTrip(i)
      if (trip.pickup_lng != null && trip.pickup_lat != null) {
        out.push({ lngLat: [trip.pickup_lng, trip.pickup_lat], label: `Đón ${trip.customer_name}`, color })
      }
      if (trip.dropoff_lng != null && trip.dropoff_lat != null) {
        out.push({ lngLat: [trip.dropoff_lng, trip.dropoff_lat], label: `Trả ${trip.customer_name}`, color })
      }
    })
    return out
  }, [context])

  return (
    <WebMap
      markers={markers}
      height={380}
      emptyMessage={markers.length === 0 ? 'Chưa có chuyến đang chạy trên bản đồ' : undefined}
    />
  )
}
