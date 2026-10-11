import { useEffect, useRef, useState } from 'react'
import { opsBaseURL, refreshAccessTokenOnce } from '../../services/api/opsClient'
import { useAuthStore } from '../../stores/authStore'
import { lineOf, parseSseChunk } from './sseParser'

export type LogStreamStatus = 'connecting' | 'live' | 'disconnected'

type Params = {
  service: string
  room: string
  conv: string
  q: string
  enabled: boolean
}

type StreamState = {
  key: string
  lines: string[]
  status: LogStreamStatus
}

const MAX_LINES = 1000
const FILTER_DEBOUNCE_MS = 300
const DEFAULT_RETRY_MS = 5000
const STICK_TO_BOTTOM_PX = 48
const NO_LINES: string[] = []

function streamQuery({ service, room, conv, q }: Params): string {
  const params = new URLSearchParams()
  if (service) params.set('service', service)
  if (room.trim()) params.set('room', room.trim())
  if (conv.trim()) params.set('conv', conv.trim())
  if (q.trim()) params.set('q', q.trim())
  return params.toString()
}

function useDebounced(value: string, ms: number): string {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return debounced
}

/**
 * Live log lines from ops-service `GET /api/v1/logs/stream`.
 * Uses fetch rather than EventSource so the bearer token can be sent. Locally the
 * stream stays open; on Lambda each response is one poll that ends with `retry`
 * and `id`, and the next request sends `Last-Event-ID` to continue without repeats.
 */
export function useLogStream(params: Params) {
  const query = useDebounced(streamQuery(params), FILTER_DEBOUNCE_MS)
  const { enabled } = params
  const [state, setState] = useState<StreamState>({ key: '', lines: NO_LINES, status: 'connecting' })
  const bottomRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    let lastEventId: string | null = null
    let timer: ReturnType<typeof setTimeout> | undefined

    const update = (next: (prev: StreamState) => StreamState) =>
      setState(prev => next(prev.key === query ? prev : { key: query, lines: NO_LINES, status: 'connecting' }))

    const append = (added: string[]) =>
      update(prev => ({ ...prev, lines: [...prev.lines, ...added].slice(-MAX_LINES) }))

    const schedule = (ms: number) => {
      timer = setTimeout(() => void connect(), ms)
    }

    const connect = async (): Promise<void> => {
      let retryMs = DEFAULT_RETRY_MS
      try {
        const headers: Record<string, string> = { Accept: 'text/event-stream' }
        const token = useAuthStore.getState().accessToken
        if (token) headers.Authorization = `Bearer ${token}`
        if (lastEventId) headers['Last-Event-ID'] = lastEventId
        const res = await fetch(`${opsBaseURL}/api/v1/logs/stream?${query}`, { headers, signal: controller.signal })

        if (res.status === 401) {
          const fresh = await refreshAccessTokenOnce()
          if (!fresh) {
            update(prev => ({ ...prev, status: 'disconnected' }))
            return
          }
          schedule(0)
          return
        }
        if (!res.ok || !res.body) throw new Error(`log stream http ${res.status}`)

        // An open stream replays its snapshot first; a poll continues from Last-Event-ID.
        const resumed = lastEventId !== null
        update(prev => ({ ...prev, status: 'live', lines: resumed ? prev.lines : NO_LINES }))

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          const parsed = parseSseChunk(buffer + decoder.decode(value, { stream: true }))
          buffer = parsed.rest
          const added: string[] = []
          for (const event of parsed.events) {
            if (event.retry !== undefined) retryMs = event.retry
            if (event.id !== undefined) lastEventId = event.id
            const line = lineOf(event)
            if (line !== null) added.push(line)
          }
          if (added.length) append(added)
        }
        if (lastEventId === null) update(prev => ({ ...prev, status: 'disconnected' }))
        schedule(retryMs)
      } catch {
        if (controller.signal.aborted) return
        update(prev => ({ ...prev, status: 'disconnected' }))
        schedule(retryMs)
      }
    }

    void connect()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [query, enabled])

  const current = state.key === query
  const lines = current ? state.lines : NO_LINES
  const status: LogStreamStatus = !enabled ? 'disconnected' : current ? state.status : 'connecting'

  useEffect(() => {
    const box = bottomRef.current?.parentElement
    if (!box) return
    const onScroll = () => {
      stickToBottom.current = box.scrollHeight - box.scrollTop - box.clientHeight < STICK_TO_BOTTOM_PX
    }
    box.addEventListener('scroll', onScroll)
    return () => box.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const box = bottomRef.current?.parentElement
    if (box && stickToBottom.current) box.scrollTop = box.scrollHeight
  }, [lines])

  return { lines, status, bottomRef }
}
