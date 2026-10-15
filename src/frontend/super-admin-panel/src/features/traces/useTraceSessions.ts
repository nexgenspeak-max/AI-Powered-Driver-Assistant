import { useQuery } from '@tanstack/react-query'
import { opsService } from '../../services/api/ops'
import type { TraceSessionSummary } from './types'

const REFETCH_MS = 5000
const LIST_LIMIT = 200
/** A session without session_end whose file has not changed for this long is treated as dead, not live. */
export const LIVE_STALE_MS = 5 * 60 * 1000

export function isLiveSession(s: TraceSessionSummary, now: number): boolean {
  return !s.ended && now - s.updatedAt < LIVE_STALE_MS
}

/** Traced voice sessions, newest first; refreshes every few seconds so live calls appear. */
export function useTraceSessions(mode: string) {
  return useQuery({
    queryKey: ['ops-traces', mode],
    queryFn: () => opsService.listTraces({ limit: LIST_LIMIT, mode: mode || undefined }),
    refetchInterval: REFETCH_MS,
  })
}
