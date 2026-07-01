import { useMutation } from '@tanstack/react-query'
import { tripsService } from '../../../services/api/trips'
import { useBookingStore } from '../../../stores/bookingStore'
import type { CreateTripPayload } from '../../../types'

export function useBookTrip() {
  const setActiveTripId = useBookingStore(s => s.setActiveTripId)
  return useMutation({
    mutationFn: (payload: CreateTripPayload) => tripsService.create(payload),
    onSuccess: trip => setActiveTripId(trip.trip_id),
  })
}
