import { useQuery } from '@tanstack/react-query'
import { callLogsService } from '../../../services/api'

export function useCallLogs(caller?: string) {
  return useQuery({
    queryKey: ['call-logs', caller],
    queryFn: () => callLogsService.list(caller ? { caller } : undefined),
    // refetchInterval: 10000,
  })
}

export function useCallLog(callId: string) {
  return useQuery({
    queryKey: ['call-log', callId],
    queryFn: () => callLogsService.get(callId),
    enabled: !!callId,
  })
}
