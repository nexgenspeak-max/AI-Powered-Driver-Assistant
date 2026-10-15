import type { GroupedSession, Turn } from './groupTurns'

/** Speech-to-first-audio at or above this is SLOW (same bar as llm-orchestrator turn_metrics). */
export const SLOW_TURN_MS = 2000

export type SessionMetrics = {
  durationMs: number | null
  userTurns: number
  llmCalls: number
  measuredTurns: number
  slowTurns: number
  totalP95Ms: number | null
  ttftAvgMs: number | null
  ttftP95Ms: number | null
  eouP95Ms: number | null
  ttsP95Ms: number | null
  maxPromptTokens: number | null
  promptTokens: number
  completionTokens: number
  toolCalls: number
  toolErrors: number
  toolErrorNames: string[]
  httpErrors: number
  opErrors: number
  agentErrors: number
  llmErrors: number
  emptyResponses: number
  fillers: number
  interruptions: number
  fallbacks: number
  repeatedQuestions: number
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function percentile(values: readonly number[], p: number): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))]
}

function average(values: readonly number[]): number | null {
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null
}

function nums(values: readonly unknown[]): number[] {
  return values.map(num).filter((v): v is number => v !== null)
}

export function normalizeUtterance(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
}

/** Same question again: identical after normalising, or ≥80% shared words (3+ words each). */
export function isRepeat(a: string, b: string): boolean {
  const x = normalizeUtterance(a)
  const y = normalizeUtterance(b)
  if (!x || !y) return false
  if (x === y) return true
  const wa = new Set(x.split(' '))
  const wb = new Set(y.split(' '))
  if (wa.size < 3 || wb.size < 3) return false
  const shared = [...wa].filter(w => wb.has(w)).length
  return shared / new Set([...wa, ...wb]).size >= 0.8
}

function countRepeats(turns: readonly Turn[]): number {
  const texts = turns.map(t => t.user?.text ?? '').filter(Boolean)
  return texts.slice(1).filter((text, i) => isRepeat(texts[i], text)).length
}

/** Pure: everything the header and insights need, recomputed as live events arrive. */
export function sessionMetrics(session: GroupedSession): SessionMetrics {
  const { turns, start, end } = session
  const calls = turns.flatMap(t => t.llmCalls)
  const tm = turns.map(t => t.metrics).filter(m => m !== undefined)
  const tools = turns.flatMap(t => t.tools)
  const ops = turns.flatMap(t => t.ops)
  const totals = nums(tm.map(m => m.total_ms))
  const responseTtft = nums(calls.map(c => c.response?.ttft_ms))
  const ttft = responseTtft.length ? responseTtft : nums(calls.map(c => c.metrics?.ttft_ms))
  const promptTokens = nums(calls.map(c => c.metrics?.prompt_tokens))
  const toolErrors = tools.filter(t => t.is_error === true)
  const lastTs = session.events.at(-1)?.ts
  return {
    durationMs: num(end?.duration_ms) ?? (start && lastTs ? Math.round((lastTs - start.ts) * 1000) : null),
    userTurns: turns.filter(t => t.user).length,
    llmCalls: calls.filter(c => c.request).length,
    measuredTurns: tm.length,
    slowTurns: tm.filter(m => m.slow === true || (num(m.total_ms) ?? 0) >= SLOW_TURN_MS).length,
    totalP95Ms: percentile(totals, 0.95),
    ttftAvgMs: average(ttft),
    ttftP95Ms: percentile(ttft, 0.95),
    eouP95Ms: percentile(nums(tm.map(m => m.eou_ms)), 0.95),
    ttsP95Ms: percentile(nums(tm.map(m => m.tts_ttfb_ms)), 0.95),
    maxPromptTokens: promptTokens.length ? Math.max(...promptTokens) : null,
    promptTokens: promptTokens.reduce((a, b) => a + b, 0),
    completionTokens: nums(calls.map(c => c.metrics?.completion_tokens)).reduce((a, b) => a + b, 0),
    toolCalls: tools.length,
    toolErrors: toolErrors.length,
    toolErrorNames: [...new Set(toolErrors.map(t => t.name ?? '?'))],
    httpErrors: ops.filter(o => o.name === 'http' && o.ok === false).length,
    opErrors: ops.filter(o => o.ok === false).length,
    agentErrors: turns.reduce((n, t) => n + t.errors.length, 0),
    llmErrors: calls.filter(c => !!c.response?.error).length,
    emptyResponses: calls.filter(c => c.response && !c.response.error && !c.response.text?.trim() && !c.response.tool_calls?.length).length,
    fillers: ops.filter(o => o.name === 'turn_filler').length,
    interruptions: turns.flatMap(t => t.speech).filter(s => s.interrupted === true).length,
    fallbacks: ops.filter(o => o.name === 'provider_fallback').length,
    repeatedQuestions: countRepeats(turns),
  }
}
