import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../../stores/authStore'
import { authService, type AuthUser } from '../../../services/api/auth'
import type { Customer } from '../../../types'

function toCustomer(user: AuthUser): Customer {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone ?? '',
    email: user.email,
    status: user.status === 'locked' ? 'offline' : user.status,
    created_at: user.created_at,
    updated_at: user.updated_at,
  }
}

// The one place the customer's profile is fetched from — GET /auth/me,
// keyed ['me'] so RegisterForm can prime this exact cache entry with the
// user object /auth/register already returns, skipping a redundant fetch
// right after signup. Never persisted (authStore.ts only keeps tokens on
// disk): this cache is memory-only and empties on every app restart, which
// is the point — see authStore.ts's comment for why.
export function useCurrentUser() {
  const accessToken = useAuthStore(s => s.accessToken)
  return useQuery({
    queryKey: ['me'],
    queryFn: () => authService.me().then(toCustomer),
    enabled: !!accessToken,
    staleTime: 60_000,
  })
}
