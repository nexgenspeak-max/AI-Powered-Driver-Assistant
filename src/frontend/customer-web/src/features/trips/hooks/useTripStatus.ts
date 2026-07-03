import { useQuery } from '@tanstack/react-query'
import { tripsService } from '../../../services/api/trips'

export function useTripStatus(tripId: string | null) {
  return useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => tripsService.get(tripId!),
    enabled: !!tripId,
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.status
      if (status === 'completed' || status === 'rejected' || status === 'no_answer') return false
      return 10000
    },
  })
}
