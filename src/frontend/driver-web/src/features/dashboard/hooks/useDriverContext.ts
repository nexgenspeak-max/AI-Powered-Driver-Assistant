import { useQuery } from '@tanstack/react-query'
import { driversService } from '../../../services/api/drivers'
import { useCurrentUser } from '../../auth/hooks/useCurrentUser'

export function useDriverContext() {
  const { data: driver } = useCurrentUser()
  return useQuery({
    queryKey: ['driverContext'],
    queryFn: () => driversService.getContext(),
    enabled: !!driver,
    staleTime: 60_000,
    placeholderData: prev => prev,
  })
}
