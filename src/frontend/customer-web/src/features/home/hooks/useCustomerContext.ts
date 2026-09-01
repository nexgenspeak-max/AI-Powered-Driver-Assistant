import { useQuery } from '@tanstack/react-query'
import { customersService } from '../../../services/api/customers'
import { useCurrentUser } from '../../auth/hooks/useCurrentUser'

export function useCustomerContext() {
  const { data: customer } = useCurrentUser()
  return useQuery({
    queryKey: ['customerContext'],
    queryFn: () => customersService.getContext(true),
    enabled: !!customer,
    placeholderData: prev => prev,
  })
}
