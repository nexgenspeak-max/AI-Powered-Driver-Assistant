import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '../../../stores/authStore'
import { queryClient } from '../../../providers/queryClient'
import { authService } from '../../../services/api/auth'
import { toDriver } from './useCurrentUser'

export const useDriverLogin = () => {
  const setDriver = useAuthStore(s => s.setDriver)
  const setTokens = useAuthStore(s => s.setTokens)

  return useMutation({
    mutationFn: (data: { phone: string; password: string }) =>
      authService.login({ role: 'driver', phone: data.phone, password: data.password }),
    onSuccess: async ({ access_token, refresh_token }) => {
      // Login no longer hands back the profile (see authService.ts) — fetch
      // it separately once the token is in place.
      setTokens(access_token, refresh_token)
      const user = await authService.me()
      const driver = toDriver(user)
      setDriver(driver)
      queryClient.setQueryData(['me'], driver)
    },
  })
}
