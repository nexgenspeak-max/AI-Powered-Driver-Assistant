import { opsClient } from './opsClient'
import type { AgentSnapshot, CallRecord, ProbeResult, PromptsSnapshot } from '../../types/ops'

export const opsService = {
  status: () =>
    opsClient.get<{ services: ProbeResult[] }>('/api/v1/status').then(r => r.data),

  agent: () =>
    opsClient.get<AgentSnapshot>('/api/v1/agent').then(r => r.data),

  prompts: () =>
    opsClient.get<PromptsSnapshot>('/api/v1/agent/prompts').then(r => r.data),

  logSnapshot: (params: { service?: string; room?: string; conv?: string; q?: string; limit?: number }) =>
    opsClient.get<{ lines: string[] }>('/api/v1/logs', { params }).then(r => r.data),

  listRecords: (params?: { caller?: string; limit?: number }) =>
    opsClient.get<CallRecord[]>('/api/v1/records', { params }).then(r => r.data),

  getRecord: (callId: string) =>
    opsClient.get<CallRecord>(`/api/v1/records/${callId}`).then(r => r.data),
}
