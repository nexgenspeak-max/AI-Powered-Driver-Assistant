import { useQuery } from '@tanstack/react-query'
import { driversService } from '../../../services/api'

export function useDrivers() {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: () => driversService.list(),
    // refetchInterval: 10000,
  })
}
