import { useQuery } from '@tanstack/react-query'
import { tripsService } from '../../../services/api/trips'

export function useTripStatus(tripId: string | null) {
  return useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => tripsService.get(tripId!),
    enabled: !!tripId,
    // Live updates: useCustomerDispatchSocket invalidates ['trip', id] on
    // trip_confirmed / trip_rejected / trip_updated. No interval poll.
  })
}
