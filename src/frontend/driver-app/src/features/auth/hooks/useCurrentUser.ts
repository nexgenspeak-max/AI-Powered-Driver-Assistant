import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../../stores/authStore'
import { authService, type AuthUser } from '../../../services/api/auth'
import type { Driver } from '../../../types'

function toDriver(user: AuthUser): Driver {
  return {
    id: user.id,
    phone: user.phone ?? '',
    name: user.name,
    email: user.email,
    status: user.status === 'locked' ? 'offline' : user.status,
    vehicle_type: user.vehicle_type,
    vehicle_plate: user.vehicle_plate,
    vehicle_name: user.vehicle_name,
    created_at: user.created_at,
    updated_at: user.updated_at,
  }
}

// The one place the driver's profile is fetched from — GET /auth/me, keyed
// ['me'] so RegisterForm can prime this exact cache entry with the user
// object /auth/register already returns, skipping a redundant fetch right
// after signup, and so the dashboard's online/offline toggle can update it
// in place via queryClient.setQueryData(['me'], ...) after a status PATCH.
// Never persisted (authStore.ts only keeps tokens on disk): this cache is
// memory-only and empties on every app restart, which is the point — see
// authStore.ts's comment for why.
export function useCurrentUser() {
  const accessToken = useAuthStore(s => s.accessToken)
  return useQuery({
    queryKey: ['me'],
    queryFn: () => authService.me().then(toDriver),
    enabled: !!accessToken,
    staleTime: 60_000,
  })
}
