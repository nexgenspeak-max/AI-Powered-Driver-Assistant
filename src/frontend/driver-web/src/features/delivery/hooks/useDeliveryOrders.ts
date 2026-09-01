import { useQuery } from '@tanstack/react-query'
import { deliveryOrdersService } from '../../../services/api/deliveryOrders'
import { useCurrentUser } from '../../auth/hooks/useCurrentUser'

export function useDeliveryOrders() {
  const { data: driver } = useCurrentUser()
  return useQuery({
    queryKey: ['deliveryOrders'],
    queryFn: () => deliveryOrdersService.list(),
    enabled: !!driver,
  })
}
