import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tripsService } from '../../../services/api'

export function useCancelTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (trip_id: string) => tripsService.cancel(trip_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }),
  })
}
