import { GlassTripCard } from './GlassTripCard'
import type { Trip } from '../../../types'

export function TripHistoryItem({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  return <GlassTripCard trip={trip} onPress={onPress} />
}
