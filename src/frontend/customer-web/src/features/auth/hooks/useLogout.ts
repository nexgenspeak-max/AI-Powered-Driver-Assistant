import { useAuthStore } from '../../../stores/authStore'
import { authService } from '../../../services/api/auth'

export function useLogout() {
  const customer = useAuthStore(s => s.customer)
  const logout = useAuthStore(s => s.logout)

  return () => {
    if (customer) {
      authService.setStatus(customer.id, 'offline').catch(() => {})
    }
    logout()
  }
}
