import { XStack, YStack, View, Text } from 'tamagui'
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

  const statusColor = TRIP_STATUS_COLORS[trip.status]

  return (
    <Card gap="$3">
      <XStack alignItems="center" gap="$3">
        <View width={40} height={40} borderRadius={20} backgroundColor="$primaryMuted" alignItems="center" justifyContent="center">
          <Text color="$primary" fontWeight="700" fontSize="$3">
            {trip.customer_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <YStack flex={1}>
          <Text fontWeight="700" color="$textPrimary" fontSize="$4">
            {trip.customer_name}
          </Text>
          {!!trip.pickup_time && (
            <Text color="$textSecondary" fontSize={12}>
              {trip.pickup_time}
            </Text>
          )}
        </YStack>
        <YStack alignItems="flex-end" gap="$1">
          <Badge label={TRIP_STATUS_LABELS[trip.status]} backgroundColor={statusColor.bg} color={statusColor.text} />
          {trip.estimated_fare != null && (
            <Text color="$textSecondary" fontSize={11}>
              {formatCurrency(trip.estimated_fare)}
            </Text>
          )}
        </YStack>
      </XStack>

      <YStack gap="$2">
        <InfoRow label="Pickup" value={trip.pickup_address} />
        <InfoRow label="Dropoff" value={trip.dropoff_address} />
        {trip.eta_minutes > 0 && <InfoRow label="ETA" value={`${trip.eta_minutes} min`} />}
        {trip.distance_km > 0 && <InfoRow label="Distance" value={`${trip.distance_km.toFixed(1)} km`} />}
      </YStack>

      {(trip.status === 'notified' || trip.status === 'calling') && (
        <YStack gap="$2">
          <Button label="Reject" variant="outline" onPress={() => reject()} loading={rejecting} full />
          <Button label="Accept" variant="primary" onPress={() => accept()} loading={accepting} full />
        </YStack>
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
