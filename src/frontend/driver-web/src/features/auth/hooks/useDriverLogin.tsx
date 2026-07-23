import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '../../../stores/authStore'
import { authService } from '../../../services/api/auth'
import type { AuthUser } from '../../../services/api/auth'
import type { Driver } from '../../../types'

function toDriver(user: AuthUser): Driver {
  return {
    id: user.id,
    phone: user.phone ?? '',
    name: user.name,
    status: user.status === 'locked' ? 'offline' : user.status,
    vehicle_type: user.vehicle_type,
    vehicle_plate: user.vehicle_plate,
    vehicle_name: user.vehicle_name,
    created_at: user.created_at,
    updated_at: user.updated_at,
  }
}

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
      setDriver(toDriver(user))
    },
  })
}
