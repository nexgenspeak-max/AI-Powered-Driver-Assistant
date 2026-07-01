import { useQuery } from '@tanstack/react-query'
import { tripsService } from '../../../services/api/trips'

export const useDriverTrips = (phone: string, status?: string) => {
  return useQuery({
    queryKey: ['trips', 'driver', phone, status],
    queryFn: () => tripsService.listByDriver(phone, status),
    // refetchInterval: 4000,
  })
}
