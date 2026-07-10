import { useQuery } from '@tanstack/react-query'
import { customersService } from '../../../services/api'

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: () => customersService.list(),
  })
}
