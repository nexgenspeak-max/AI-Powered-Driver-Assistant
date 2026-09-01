import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuthStore } from '../../../stores/authStore'
import { authService, type AuthUser } from '../../../services/api/auth'
import type { Driver } from '../../../types'

export function toDriver(user: AuthUser): Driver {
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

export function useCurrentUser() {
  const accessToken = useAuthStore(s => s.accessToken)
  const setDriver = useAuthStore(s => s.setDriver)
  const query = useQuery({
    queryKey: ['me'],
    queryFn: () => authService.me().then(toDriver),
    enabled: !!accessToken,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (query.data) setDriver(query.data)
  }, [query.data, setDriver])

  return query
}
