import { useMutation } from '@tanstack/react-query'
import { tripsService } from '../../../services/api/trips'
import type { CreateTripPayload } from '../../../types'

export function useBookTrip() {
  return useMutation({
    mutationFn: (payload: CreateTripPayload) => tripsService.create(payload),
  })
}
