import { View, Text } from 'react-native'
import { TripCard } from './TripCard'
import type { Trip } from '../../../types'

interface Props {
  title: string
  trips: (Trip & { estimated_fare?: number })[]
}

export function TripSection({ title, trips }: Props) {
  if (trips.length === 0) return null
  return (
    <View className="gap-3">
      <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</Text>
      {trips.map(trip => <TripCard key={trip.trip_id} trip={trip} />)}
    </View>
  )
}
