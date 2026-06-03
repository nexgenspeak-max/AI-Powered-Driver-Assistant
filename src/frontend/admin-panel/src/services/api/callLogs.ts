import { callLoggerClient } from './client'
import type { CallLog } from '../../types'

export const callLogsService = {
  list: (params?: { caller?: string; limit?: number }) =>
    callLoggerClient.get<CallLog[]>('/api/v1/records', { params }).then(r => r.data),

  get: (callId: string) =>
    callLoggerClient.get<CallLog>(`/api/v1/records/${callId}`).then(r => r.data),
}
