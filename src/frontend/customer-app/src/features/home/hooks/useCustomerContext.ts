import { useQuery } from '@tanstack/react-query'
import { customersService } from '../../../services/api/customers'
import { useCurrentUser } from '../../auth/hooks/useCurrentUser'

// Mirrors driver-app's useDriverContext.ts. Socket events
// (trip_confirmed / trip_updated / driver_location) invalidate this query.
// fresh=true — customerContextKey is not cleared on GPS pings, only on
// trip-status changes; a cached GET after driver_location would show a
// stale marker for up to that TTL.
export function useCustomerContext() {
  const { data: customer } = useCurrentUser()
  return useQuery({
    queryKey: ['customerContext'],
    queryFn: () => customersService.getContext(true),
    enabled: !!customer,
    placeholderData: (prev: unknown) => prev,
  })
}
