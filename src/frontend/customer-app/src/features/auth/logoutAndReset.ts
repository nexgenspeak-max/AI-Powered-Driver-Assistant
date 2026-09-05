import { router } from 'expo-router'
import { queryClient } from '../../providers/QueryProvider'
import { useAuthStore } from '../../stores/authStore'

/** Clear session + cached profile, then land on the auth Landing (`(auth)/index`). */
export function logoutAndReset() {
  useAuthStore.getState().logout()
  queryClient.clear()
  // Explicit auth href — bare `/` can resolve to `(app)/index` before
  // Stack.Protected re-evaluates the logged-out guard.
  router.replace('/(auth)')
}
