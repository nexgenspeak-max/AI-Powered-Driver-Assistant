import { useQuery } from '@tanstack/react-query'
import { tripsService } from '../../../services/api/trips'

export function useTripHistory() {
  return useQuery({
    queryKey: ['trip-history'],
    queryFn: () => tripsService.history(),
  })
}
