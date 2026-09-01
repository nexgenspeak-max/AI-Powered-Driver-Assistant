import { useQuery } from '@tanstack/react-query'
import { tripsService } from '../../../services/api/trips'
import type { TripStatus } from '../../../types'

export const useDriverTrips = (phone: string, status?: TripStatus) => {
  return useQuery({
    queryKey: ['trips', 'driver', phone, status],
    queryFn: () => tripsService.listByDriver(phone, status),
    // refetchInterval: 4000,
  })
}
