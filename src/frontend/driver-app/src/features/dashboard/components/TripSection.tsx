import { YStack, Text } from 'tamagui'
import { TripCard } from './TripCard'
import type { Trip } from '../../../types'

interface Props {
  title: string
  trips: (Trip & { estimated_fare?: number })[]
}

export function TripSection({ title, trips }: Props) {
  if (trips.length === 0) return null
  return (
    <YStack gap="$3">
      <Text fontSize="$1" fontWeight="600" color="$textSecondary" textTransform="uppercase" letterSpacing={0.5}>
        {title}
      </Text>
      {trips.map(trip => (
        <TripCard key={trip.trip_id} trip={trip} />
      ))}
    </YStack>
  )
}
