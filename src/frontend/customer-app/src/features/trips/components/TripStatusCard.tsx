import { View, Text, ScrollView } from 'react-native'
import { Card } from '../../../components/Card'
import { Badge } from '../../../components/Badge'
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS } from '../../../constants/status'
import type { Trip } from '../../../types'

export function TripStatusCard({ trip }: { trip: Trip }) {
  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-5 pt-16 gap-4">
      <View>
        <Text className="text-2xl font-extrabold text-gray-900">Trip Status</Text>
        <Text className="text-gray-500 text-sm mt-1">#{trip.trip_id}</Text>
      </View>

      <Card className="gap-3">
        <Badge label={TRIP_STATUS_LABELS[trip.status]} className={TRIP_STATUS_COLORS[trip.status]} />

        <View className="gap-1">
          <Text className="text-xs text-gray-400 uppercase tracking-wider">Pickup</Text>
          <Text className="text-gray-900 text-base">{trip.pickup_address}</Text>
        </View>
        <View className="gap-1">
          <Text className="text-xs text-gray-400 uppercase tracking-wider">Dropoff</Text>
          <Text className="text-gray-900 text-base">{trip.dropoff_address}</Text>
        </View>

        {!!trip.driver_phone && (
          <View className="gap-1">
            <Text className="text-xs text-gray-400 uppercase tracking-wider">Driver</Text>
            <Text className="text-gray-900 text-base">{trip.driver_phone}</Text>
          </View>
        )}

        {(trip.distance_km > 0 || trip.eta_minutes > 0) && (
          <View className="flex-row gap-4">
            {trip.distance_km > 0 && (
              <Text className="text-sm text-gray-500">{trip.distance_km.toFixed(1)} km</Text>
            )}
            {trip.eta_minutes > 0 && (
              <Text className="text-sm text-gray-500">{trip.eta_minutes} min ETA</Text>
            )}
          </View>
        )}
      </Card>
    </ScrollView>
  )
}
