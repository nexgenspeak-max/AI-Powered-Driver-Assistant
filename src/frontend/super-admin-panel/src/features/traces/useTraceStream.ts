import { useEffect, useState } from 'react'
import { opsBaseURL, refreshAccessTokenOnce } from '../../services/api/opsClient'
import { useAuthStore } from '../../stores/authStore'
import { parseSseChunk, type SseEvent } from '../logs/sseParser'
import { toTraceEvent, type TraceEvent } from './types'

/** `missing`: no trace file yet (retrying); `ended`: session_end received, stream closed. */
export type TraceStreamStatus = 'idle' | 'connecting' | 'live' | 'ended' | 'missing' | 'disconnected'

type StreamState = { key: string; events: TraceEvent[]; status: TraceStreamStatus }

const RETRY_MS = 3000
const NO_EVENTS: TraceEvent[] = []

function traceOf(event: SseEvent): TraceEvent | null {
  if (event.data === undefined) return null
  try {
    return toTraceEvent(JSON.parse(event.data))
  } catch {
    return null
  }
}

/** Appends events not seen yet (by seq), keeping seq order. */
export function mergeBySeq(prev: TraceEvent[], added: readonly TraceEvent[]): TraceEvent[] {
  const seen = new Set(prev.map(e => e.seq))
  const fresh: TraceEvent[] = []
  for (const e of added) {
    if (seen.has(e.seq)) continue
    seen.add(e.seq)
    fresh.push(e)
  }
  if (!fresh.length) return prev
  const lastSeq = prev.at(-1)?.seq ?? -Infinity
  const merged = [...prev, ...fresh]
  return fresh.every(e => e.seq > lastSeq) ? merged : merged.sort((a, b) => a.seq - b.seq)
}

/**
 * All events of one session from ops-service `GET /api/v1/traces/:room/stream`:
 * the file is replayed, then new lines arrive live. fetch (not EventSource) so the
 * bearer token is sent; reconnects resume with Last-Event-ID (= seq).
 */
export function useTraceStream(room: string | null): { events: TraceEvent[]; status: TraceStreamStatus } {
  const key = room ?? ''
  const [state, setState] = useState<StreamState>({ key: '', events: NO_EVENTS, status: 'idle' })

  useEffect(() => {
    if (!key) return
    const controller = new AbortController()
    let lastEventId: string | null = null
    let finished = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const update = (next: (prev: StreamState) => StreamState) =>
      setState(prev => next(prev.key === key ? prev : { key, events: NO_EVENTS, status: 'connecting' }))
    const schedule = (ms: number) => {
      timer = setTimeout(() => void connect(), ms)
    }

    const connect = async (): Promise<void> => {
      try {
        const headers: Record<string, string> = { Accept: 'text/event-stream' }
        const token = useAuthStore.getState().accessToken
        if (token) headers.Authorization = `Bearer ${token}`
        if (lastEventId) headers['Last-Event-ID'] = lastEventId
        const res = await fetch(`${opsBaseURL}/api/v1/traces/${encodeURIComponent(key)}/stream`, {
          headers,
          signal: controller.signal,
        })
        if (res.status === 401) {
          if (await refreshAccessTokenOnce()) schedule(0)
          else update(prev => ({ ...prev, status: 'disconnected' }))
          return
        }
        if (res.status === 404) {
          update(prev => ({ ...prev, status: 'missing' }))
          schedule(RETRY_MS)
          return
        }
        if (!res.ok || !res.body) throw new Error(`trace stream http ${res.status}`)
        update(prev => ({ ...prev, status: 'live' }))

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          const parsed = parseSseChunk(buffer + decoder.decode(value, { stream: true }))
          buffer = parsed.rest
          const added: TraceEvent[] = []
          for (const sse of parsed.events) {
            if (sse.id !== undefined) lastEventId = sse.id
            const event = traceOf(sse)
            if (event) added.push(event)
          }
          if (!added.length) continue
          finished ||= added.some(e => e.kind === 'session_end')
          const status: TraceStreamStatus = finished ? 'ended' : 'live'
          update(prev => ({ ...prev, events: mergeBySeq(prev.events, added), status }))
          if (finished) {
            controller.abort()
            return
          }
        }
        schedule(RETRY_MS)
      } catch {
        if (controller.signal.aborted) return
        update(prev => ({ ...prev, status: 'disconnected' }))
        schedule(RETRY_MS)
      }
    }

    void connect()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [key])

  if (!key) return { events: NO_EVENTS, status: 'idle' }
  return state.key === key ? { events: state.events, status: state.status } : { events: NO_EVENTS, status: 'connecting' }
}
