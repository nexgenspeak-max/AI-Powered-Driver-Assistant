import { useAuthStore } from '../../../stores/authStore'
import { authService } from '../../../services/api/auth'

export function useLogout() {
  const admin = useAuthStore(s => s.admin)
  const logout = useAuthStore(s => s.logout)

  return () => {
    if (admin) {
      authService.setStatus(admin.id, 'offline').catch(() => {})
    }
    logout()
  }
}
