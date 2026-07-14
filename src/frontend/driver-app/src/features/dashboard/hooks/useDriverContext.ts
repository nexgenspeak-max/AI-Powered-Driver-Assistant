import { useQuery } from '@tanstack/react-query'
import { driversService } from '../../../services/api/drivers'
import { useAuthStore } from '../../../stores/authStore'

export function useDriverContext() {
  const driver = useAuthStore(s => s.driver)
  return useQuery({
    queryKey: ['driverContext'],
    queryFn: () => driversService.getContext(),
    enabled: !!driver,
    refetchInterval: 5000,
  })
}
