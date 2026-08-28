import { useQuery } from '@tanstack/react-query'
import { customersService } from '../../../services/api/customers'
import { useCurrentUser } from '../../auth/hooks/useCurrentUser'

// Mirrors driver-app's useDriverContext.ts — same 5s poll cadence so
// CustomerMap picks up a newly-assigned driver's location, a trip getting
// confirmed, etc. without the customer having to pull-to-refresh anything.
//
// fresh=true (unlike driver-app's own poll) — the backend's customerContext
// cache (customerContextKey, up to config.cacheTtlSeconds) only gets
// invalidated on trip-status changes, never on a driver's location update
// alone (see cacheDriverLocation in routes/drivers.ts, which only
// invalidates the DRIVER's own context). Polling with the cache would leave
// this map showing the same driver_location for up to that whole TTL after
// every GPS ping — bypassing it here trades a slightly heavier read for the
// map actually looking live.
export function useCustomerContext() {
  const { data: customer } = useCurrentUser()
  return useQuery({
    queryKey: ['customerContext'],
    queryFn: () => customersService.getContext(true),
    enabled: !!customer,
    refetchInterval: 5000,
  })
}
