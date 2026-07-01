import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tripsService } from '../../../services/api'

export function useDispatchTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ trip_id, driver_phone }: { trip_id: string; driver_phone: string }) =>
      tripsService.dispatch(trip_id, driver_phone),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }),
  })
}
