import { useQuery } from '@tanstack/react-query'
import { deliveryOrdersService } from '../../../services/api/deliveryOrders'
import { useCurrentUser } from '../../auth/hooks/useCurrentUser'

export function useDeliveryOrders() {
  // Gated on the fetched profile for the same reason as useDriverContext —
  // apiClient's X-Driver-Phone header comes from the ['me'] cache, so firing
  // before the phone is known would just 400.
  const { data: driver } = useCurrentUser()
  return useQuery({
    queryKey: ['deliveryOrders'],
    queryFn: () => deliveryOrdersService.list(),
    enabled: !!driver,
  })
}
