import { useCurrentUser } from '../features/auth/hooks/useCurrentUser'
import { useDispatchSocket } from '../features/dispatch/hooks/useDispatchSocket'

/** Wire realtime dispatch when authenticated. */
export default function DispatchHooks() {
  const { data: driver } = useCurrentUser()
  useDispatchSocket(driver?.status === 'online', driver?.phone)
  return null
}
