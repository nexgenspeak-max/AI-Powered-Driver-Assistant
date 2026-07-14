import { View, Text } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '../../../components/Card'
import { Badge } from '../../../components/Badge'
import { Button } from '../../../components/Button'
import { InfoRow } from './InfoRow'
import { tripsService } from '../../../services/api/trips'
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS } from '../../../constants/status'
import { formatCurrency } from '../../../utils/format'
import type { Trip } from '../../../types'

export function TripCard({ trip }: { trip: Trip & { estimated_fare?: number } }) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['driverContext'] })

  const { mutate: accept, isPending: accepting } = useMutation({
    mutationFn: () => tripsService.accept(trip.trip_id),
    onSuccess: invalidate,
  })
  const { mutate: reject, isPending: rejecting } = useMutation({
    mutationFn: () => tripsService.reject(trip.trip_id),
    onSuccess: invalidate,
  })
  const { mutate: arrivedPickup, isPending: arriving } = useMutation({
    mutationFn: () => tripsService.arrivedPickup(trip.trip_id),
    onSuccess: invalidate,
  })
  const { mutate: pickedUp, isPending: pickingUp } = useMutation({
    mutationFn: () => tripsService.pickedUp(trip.trip_id),
    onSuccess: invalidate,
  })
  const { mutate: complete, isPending: completing } = useMutation({
    mutationFn: () => tripsService.complete(trip.trip_id),
    onSuccess: invalidate,
  })

  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="font-bold text-gray-900 text-base">{trip.customer_name}</Text>
        <Badge label={TRIP_STATUS_LABELS[trip.status]} className={TRIP_STATUS_COLORS[trip.status]} />
      </View>

      <View className="gap-1.5">
        <InfoRow label="Pickup" value={trip.pickup_address} />
        <InfoRow label="Dropoff" value={trip.dropoff_address} />
        {!!trip.pickup_time && <InfoRow label="Pickup time" value={trip.pickup_time} />}
        {trip.eta_minutes > 0 && <InfoRow label="ETA" value={`${trip.eta_minutes} min`} />}
        {trip.distance_km > 0 && <InfoRow label="Distance" value={`${trip.distance_km.toFixed(1)} km`} />}
        {trip.estimated_fare != null && <InfoRow label="Estimated fare" value={formatCurrency(trip.estimated_fare)} />}
      </View>

      {(trip.status === 'notified' || trip.status === 'calling') && (
        <View className="flex-row gap-2">
          <Button label="Reject" variant="outline" onPress={() => reject()} loading={rejecting} full />
          <Button label="Accept" variant="primary" onPress={() => accept()} loading={accepting} full />
        </View>
      )}
      {trip.status === 'confirmed' && (
        <Button label="Arrived at Pickup" variant="dark" onPress={() => arrivedPickup()} loading={arriving} full />
      )}
      {trip.status === 'arrived_pickup' && (
        <Button label="Picked Up Customer" variant="dark" onPress={() => pickedUp()} loading={pickingUp} full />
      )}
      {trip.status === 'picked_up' && (
        <Button label="Complete Trip" variant="success" onPress={() => complete()} loading={completing} full />
      )}
    </Card>
  )
}
