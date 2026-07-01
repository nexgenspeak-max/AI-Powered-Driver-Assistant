import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tripsService } from '../../../services/api'

export function useCreateTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tripsService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }),
  })
}
