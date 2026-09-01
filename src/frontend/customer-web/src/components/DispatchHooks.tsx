import { useCurrentUser } from '../features/auth/hooks/useCurrentUser'
import { useCustomerDispatchSocket } from '../features/dispatch/hooks/useCustomerDispatchSocket'

/** Wire realtime trip updates when authenticated. */
export default function DispatchHooks() {
  const { data: customer } = useCurrentUser()
  useCustomerDispatchSocket(customer?.id)
  return null
}
