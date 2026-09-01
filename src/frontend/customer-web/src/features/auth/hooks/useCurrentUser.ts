import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuthStore } from '../../../stores/authStore'
import { authService, type AuthUser } from '../../../services/api/auth'
import type { Customer } from '../../../types'

export function toCustomer(user: AuthUser): Customer {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone ?? '',
    status: user.status === 'locked' ? 'offline' : user.status,
    created_at: user.created_at,
    updated_at: user.updated_at,
  }
}

export function useCurrentUser() {
  const accessToken = useAuthStore(s => s.accessToken)
  const setCustomer = useAuthStore(s => s.setCustomer)
  const query = useQuery({
    queryKey: ['me'],
    queryFn: () => authService.me().then(toCustomer),
    enabled: !!accessToken,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (query.data) setCustomer(query.data)
  }, [query.data, setCustomer])

  return query
}
