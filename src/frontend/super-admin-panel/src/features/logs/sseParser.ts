export type SseEvent = {
  data?: string
  id?: string
  retry?: number
}

function parseEvent(block: string): SseEvent | null {
  const event: SseEvent = {}
  const data: string[] = []
  for (const raw of block.split(/\r?\n/)) {
    if (!raw || raw.startsWith(':')) continue
    const colon = raw.indexOf(':')
    const field = colon < 0 ? raw : raw.slice(0, colon)
    const value = colon < 0 ? '' : raw.slice(colon + 1).replace(/^ /, '')
    if (field === 'data') data.push(value)
    else if (field === 'id') event.id = value
    else if (field === 'retry' && /^\d+$/.test(value)) event.retry = Number(value)
  }
  if (data.length) event.data = data.join('\n')
  return event.data !== undefined || event.id !== undefined || event.retry !== undefined ? event : null
}

/** Complete events in `buffer`, plus the unfinished tail to prepend to the next chunk. */
export function parseSseChunk(buffer: string): { events: SseEvent[]; rest: string } {
  const blocks = buffer.split(/\r?\n\r?\n/)
  const rest = blocks.pop() ?? ''
  const events = blocks.map(parseEvent).filter((e): e is SseEvent => e !== null)
  return { events, rest }
}

/** `data: {"line": "..."}` from ops-service; anything else is ignored. */
export function lineOf(event: SseEvent): string | null {
  if (event.data === undefined) return null
  try {
    const parsed: unknown = JSON.parse(event.data)
    const line = (parsed as { line?: unknown })?.line
    return typeof line === 'string' ? line : null
  } catch {
    return null
  }
}
