import { useQuery } from '@tanstack/react-query'
import { driversService } from '../../../services/api/drivers'
import { useCurrentUser } from '../../auth/hooks/useCurrentUser'

export function useDriverContext() {
  // Gated on the fetched profile (not just the access token) because
  // apiClient.ts reads this same ['me'] cache to fill the X-Driver-Phone
  // header this endpoint requires — firing before the phone is known would
  // just 400.
  const { data: driver } = useCurrentUser()
  return useQuery({
    queryKey: ['driverContext'],
    queryFn: () => driversService.getContext(),
    enabled: !!driver,
    staleTime: 60_000,
    // No interval poll — trip_offer / schedule_updated / pending_nudge on
    // the dispatch socket invalidate this query. Same host as REST: if the
    // socket is down the API is down too.
    placeholderData: (prev) => prev,
  })
}
