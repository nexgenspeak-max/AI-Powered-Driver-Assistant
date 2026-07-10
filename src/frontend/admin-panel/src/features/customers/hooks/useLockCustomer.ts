import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authService } from '../../../services/api/auth'

export function useLockCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, locked }: { id: string; locked: boolean }) =>
      authService.setStatus(id, locked ? 'locked' : 'offline'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  })
}
