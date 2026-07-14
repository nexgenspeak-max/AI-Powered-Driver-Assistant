import { useQuery } from '@tanstack/react-query'
import { driversService } from '../../../services/api/drivers'

export function useEarningsSummary(period: 'week' | 'month') {
  return useQuery({
    queryKey: ['earnings', 'summary', period],
    queryFn: () => driversService.getEarningsSummary(period),
  })
}
