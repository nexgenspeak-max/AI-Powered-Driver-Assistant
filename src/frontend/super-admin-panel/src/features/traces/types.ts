/**
 * Prompt-trace contract: one JSON line per event in
 * `<llm-orchestrator logs>/traces/<room>.jsonl`, served by ops-service
 * `/api/v1/traces`. Payload fields are optional because the writer may omit them.
 */
type Base<K extends string> = {
  v: number
  /** Epoch seconds (float). */
  ts: number
  room: string
  seq: number
  /** 0 before the first user utterance; +1 at each `user`. */
  turn: number
  kind: K
}

export type ChatItem = {
  type: 'message' | 'function_call' | 'function_call_output' | string
  role: string | null
  content: string
  name: string | null
  call_id: string | null
}

export type ToolSchema = { name: string; description: string | null; parameters: unknown }
export type ToolCall = { name: string; arguments: string; call_id: string }

export type SessionStartEvent = Base<'session_start'> & {
  mode?: string
  lang?: string
  agent?: string
  participant?: string
  model?: string
  stt?: string
  tts?: string
}
export type UserEvent = Base<'user'> & { text?: string; language?: string }
export type LlmRequestEvent = Base<'llm_request'> & {
  call?: number
  model?: string
  tool_choice?: string | null
  messages?: ChatItem[]
  tools?: ToolSchema[]
}
export type LlmResponseEvent = Base<'llm_response'> & {
  call?: number
  text?: string
  tool_calls?: ToolCall[]
  duration_ms?: number
  ttft_ms?: number | null
  error?: string | null
}
export type LlmMetricsEvent = Base<'llm_metrics'> & {
  prompt_tokens?: number
  completion_tokens?: number
  ttft_ms?: number
  duration_ms?: number
  request_id?: string
}
export type ToolEvent = Base<'tool'> & {
  name?: string
  arguments?: unknown
  output?: unknown
  is_error?: boolean
  call_id?: string
  duration_ms?: number | null
}
export type SpeechEvent = Base<'speech'> & {
  role?: string
  text?: string
  interrupted?: boolean
  source?: 'llm' | 'say' | null
}
export type TurnMetricsEvent = Base<'turn_metrics'> & {
  eou_ms?: number | null
  llm_ttft_ms?: number | null
  tts_ttfb_ms?: number | null
  total_ms?: number | null
  slow?: boolean
}
export type OpEvent = Base<'op'> & { name?: string; ok?: boolean; fields?: Record<string, unknown> }
export type ErrorEvent = Base<'error'> & { where?: string; message?: string }
export type SessionEndEvent = Base<'session_end'> & { duration_ms?: number; reason?: string }

export type TraceEvent =
  | SessionStartEvent
  | UserEvent
  | LlmRequestEvent
  | LlmResponseEvent
  | LlmMetricsEvent
  | ToolEvent
  | SpeechEvent
  | TurnMetricsEvent
  | OpEvent
  | ErrorEvent
  | SessionEndEvent

export type TraceKind = TraceEvent['kind']

const KINDS: ReadonlySet<string> = new Set<TraceKind>([
  'session_start', 'user', 'llm_request', 'llm_response', 'llm_metrics', 'tool',
  'speech', 'turn_metrics', 'op', 'error', 'session_end',
])

/** Known event, or null for anything that does not match the contract. */
export function toTraceEvent(value: unknown): TraceEvent | null {
  const e = value as Partial<Base<string>> | null
  if (!e || typeof e !== 'object') return null
  if (typeof e.seq !== 'number' || typeof e.turn !== 'number' || typeof e.ts !== 'number') return null
  return typeof e.kind === 'string' && KINDS.has(e.kind) ? (e as TraceEvent) : null
}

export type TraceSessionStats = {
  slowTurns: number
  avgTtftMs: number | null
  p95TotalMs: number | null
  maxPromptTokens: number | null
  toolErrors: number
  opErrors: number
  interruptions: number
  fillers: number
}

/** `GET /api/v1/traces` row. */
export type TraceSessionSummary = {
  room: string
  mode: string | null
  lang: string | null
  participant: string | null
  /** ms */
  startedAt: number
  /** ms (file mtime) */
  updatedAt: number
  turns: number
  llmCalls: number
  ended: boolean
  sizeBytes: number
  stats: TraceSessionStats
}

export type TraceSessionDetail = { room: string; events: unknown[] }
