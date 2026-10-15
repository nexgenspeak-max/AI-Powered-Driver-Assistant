import type {
  ChatItem, ErrorEvent, LlmMetricsEvent, LlmRequestEvent, LlmResponseEvent, OpEvent,
  SessionEndEvent, SessionStartEvent, SpeechEvent, ToolEvent, TraceEvent, TurnMetricsEvent, UserEvent,
} from './types'

export type LlmCall = {
  key: string
  call: number | null
  request?: LlmRequestEvent
  response?: LlmResponseEvent
  metrics?: LlmMetricsEvent
  /** System/developer messages identical to the previous LLM call in the session. */
  sameSystemAsPrevious: boolean
}

export type Turn = {
  index: number
  /** Epoch seconds of the first event in the turn. */
  ts: number
  user?: UserEvent
  llmCalls: LlmCall[]
  tools: ToolEvent[]
  speech: SpeechEvent[]
  ops: OpEvent[]
  errors: ErrorEvent[]
  metrics?: TurnMetricsEvent
  events: TraceEvent[]
}

export type GroupedSession = {
  start?: SessionStartEvent
  end?: SessionEndEvent
  turns: Turn[]
  events: TraceEvent[]
}

const SYSTEM_ROLES = new Set(['system', 'developer'])

export function isSystemItem(item: ChatItem): boolean {
  return item.type === 'message' && !!item.role && SYSTEM_ROLES.has(item.role)
}

export function systemText(request: LlmRequestEvent | undefined): string {
  return (request?.messages ?? []).filter(isSystemItem).map(m => m.content).join('\n\n')
}

/** Events sorted by seq with duplicates (same seq) dropped. */
export function dedupeBySeq(events: readonly TraceEvent[]): TraceEvent[] {
  const bySeq = new Map<number, TraceEvent>()
  for (const e of events) if (!bySeq.has(e.seq)) bySeq.set(e.seq, e)
  return [...bySeq.values()].sort((a, b) => a.seq - b.seq)
}

function emptyTurn(index: number, ts: number): Turn {
  return { index, ts, llmCalls: [], tools: [], speech: [], ops: [], errors: [], events: [] }
}

/** Request/response pair by `call`; metrics carry no call id and go to the oldest call still missing them. */
function pairLlm(calls: LlmCall[], e: LlmRequestEvent | LlmResponseEvent | LlmMetricsEvent): LlmCall[] {
  if (e.kind === 'llm_metrics') {
    const i = calls.findIndex(c => !c.metrics)
    if (i < 0) return [...calls, { key: `m${e.seq}`, call: null, metrics: e, sameSystemAsPrevious: false }]
    return calls.map((c, j) => (j === i ? { ...c, metrics: e } : c))
  }
  const call = typeof e.call === 'number' ? e.call : null
  const i = call === null ? -1 : calls.findIndex(c => c.call === call)
  const slot = e.kind === 'llm_request' ? { request: e } : { response: e }
  if (i < 0) return [...calls, { key: `c${call ?? e.seq}`, call, sameSystemAsPrevious: false, ...slot }]
  return calls.map((c, j) => (j === i ? { ...c, ...slot } : c))
}

function addToTurn(turn: Turn, e: TraceEvent): Turn {
  const next = { ...turn, events: [...turn.events, e] }
  switch (e.kind) {
    case 'user':
      return { ...next, user: next.user ?? e }
    case 'llm_request':
    case 'llm_response':
    case 'llm_metrics':
      return { ...next, llmCalls: pairLlm(next.llmCalls, e) }
    case 'tool':
      return { ...next, tools: [...next.tools, e] }
    case 'speech':
      return { ...next, speech: [...next.speech, e] }
    case 'op':
      return { ...next, ops: [...next.ops, e] }
    case 'error':
      return { ...next, errors: [...next.errors, e] }
    case 'turn_metrics':
      return { ...next, metrics: e }
    default:
      return next
  }
}

function markRepeatedSystem(turns: Turn[]): Turn[] {
  let previous: string | null = null
  return turns.map(turn => ({
    ...turn,
    llmCalls: turn.llmCalls.map(c => {
      if (!c.request) return c
      const text = systemText(c.request)
      const same = previous !== null && text === previous
      previous = text
      return { ...c, sameSystemAsPrevious: same }
    }),
  }))
}

/** Pure: trace events → turns (turn 0 holds the greeting before the first user utterance). */
export function groupTurns(input: readonly TraceEvent[]): GroupedSession {
  const events = dedupeBySeq(input)
  const byIndex = new Map<number, Turn>()
  let start: SessionStartEvent | undefined
  let end: SessionEndEvent | undefined
  for (const e of events) {
    if (e.kind === 'session_start') { start ??= e; continue }
    if (e.kind === 'session_end') { end = e; continue }
    const turn = byIndex.get(e.turn) ?? emptyTurn(e.turn, e.ts)
    byIndex.set(e.turn, addToTurn(turn, e))
  }
  const turns = [...byIndex.values()].sort((a, b) => a.index - b.index)
  return { start, end, turns: markRepeatedSystem(turns), events }
}
