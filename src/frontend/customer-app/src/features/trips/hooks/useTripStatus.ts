import { useQuery } from '@tanstack/react-query'
import { tripsService } from '../../../services/api/trips'

export function useTripStatus(tripId: string | null) {
  return useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => tripsService.get(tripId!),
    enabled: !!tripId,
    refetchInterval: query => {
      const status = query.state.data?.status
      // `rejected`/`no_answer` are deliberately NOT here — POST
      // /:tripId/dispatch retries from either (redispatches to another
      // driver), so the trip can still move again on its own; stopping
      // polling there would leave the screen stuck showing "Rejected"
      // forever instead of picking up the retry (see trips.ts route's
      // CANCELLED_STATUSES for the same reasoning on the backend side).
      const terminal = ['completed', 'cancelled', 'cancelled_by_driver', 'no_show']
      if (status && terminal.includes(status)) return false
      return 10000
    },
  })
}
