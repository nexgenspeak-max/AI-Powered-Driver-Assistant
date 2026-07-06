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

export const useDriverRegister = () => {
  const setDriver = useAuthStore(s => s.setDriver)
  const setTokens = useAuthStore(s => s.setTokens)

  return useMutation({
    mutationFn: (data: {
      name: string; phone: string; email: string; password: string;
      vehicle_type: string; vehicle_plate: string; vehicle_name: string;
    }) => authService.register({ role: 'driver', ...data }),
    onSuccess: ({ access_token, refresh_token, user }) => {
      setTokens(access_token, refresh_token)
      setDriver(toDriver(user))
    },
  })
}
