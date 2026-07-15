import { View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Badge } from '../../../components/Badge'
import { TRIP_STATUS_LABELS, TRIP_STATUS_COLORS } from '../../../constants/status'
import { formatDate } from '../../../utils/format'
import type { Trip } from '../../../types'

export function TripHistoryItem({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 gap-2" activeOpacity={0.8}>
      <View className="flex-row items-center justify-between">
        <Badge label={TRIP_STATUS_LABELS[trip.status]} className={TRIP_STATUS_COLORS[trip.status]} />
        <Text className="text-gray-400 text-xs">{formatDate(trip.created_at)}</Text>
      </View>

      <View className="gap-1">
        <View className="flex-row items-start gap-2">
          <Ionicons name="ellipse" size={8} color="#6c8aff" style={{ marginTop: 5 }} />
          <Text className="text-gray-900 text-sm flex-1" numberOfLines={1}>{trip.pickup_address}</Text>
        </View>
        <View className="flex-row items-start gap-2">
          <Ionicons name="location" size={10} color="#401f68" style={{ marginTop: 3 }} />
          <Text className="text-gray-900 text-sm flex-1" numberOfLines={1}>{trip.dropoff_address}</Text>
        </View>
      </View>

      {!!trip.driver_phone && (
        <Text className="text-gray-400 text-xs">Driver: {trip.driver_phone}</Text>
      )}
    </TouchableOpacity>
  )
}
