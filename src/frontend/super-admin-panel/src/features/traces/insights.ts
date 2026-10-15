import { SLOW_TURN_MS, type SessionMetrics } from './metrics'

export const LLM_TTFT_SLOW_MS = 2000
export const PROMPT_TOKENS_HIGH = 6000
export const EOU_SLOW_MS = 1200
export const TTS_SLOW_MS = 1000

export type InsightKey =
  | 'slowLlm'
  | 'slowTurns'
  | 'slowEou'
  | 'slowTts'
  | 'bigPrompt'
  | 'toolErrors'
  | 'httpErrors'
  | 'llmErrors'
  | 'agentErrors'
  | 'emptyResponse'
  | 'fillers'
  | 'interruptions'
  | 'repeatedQuestion'
  | 'fallbacks'

export type InsightSeverity = 'error' | 'warning' | 'info'

/** Values interpolated into the localised hint (`tracesMessages.insights[key]`). */
export type InsightParams = { n: number; ms: number; total: number; names: string }

export type Insight = { key: InsightKey; severity: InsightSeverity; params: InsightParams }

const SEVERITY_ORDER: Record<InsightSeverity, number> = { error: 0, warning: 1, info: 2 }

function insight(key: InsightKey, severity: InsightSeverity, params: Partial<InsightParams> = {}): Insight {
  return { key, severity, params: { n: 0, ms: 0, total: 0, names: '', ...params } }
}

/** Pure: improvement hints for one session, most severe first. */
export function buildInsights(m: SessionMetrics): Insight[] {
  const out: Insight[] = []
  if (m.ttftP95Ms !== null && m.ttftP95Ms > LLM_TTFT_SLOW_MS) out.push(insight('slowLlm', 'warning', { ms: m.ttftP95Ms }))
  if (m.slowTurns > 0) {
    out.push(insight('slowTurns', 'warning', { n: m.slowTurns, total: m.measuredTurns, ms: m.totalP95Ms ?? SLOW_TURN_MS }))
  }
  if (m.eouP95Ms !== null && m.eouP95Ms > EOU_SLOW_MS) out.push(insight('slowEou', 'info', { ms: m.eouP95Ms }))
  if (m.ttsP95Ms !== null && m.ttsP95Ms > TTS_SLOW_MS) out.push(insight('slowTts', 'info', { ms: m.ttsP95Ms }))
  if (m.maxPromptTokens !== null && m.maxPromptTokens > PROMPT_TOKENS_HIGH) {
    out.push(insight('bigPrompt', 'warning', { n: m.maxPromptTokens }))
  }
  if (m.toolErrors > 0) out.push(insight('toolErrors', 'error', { n: m.toolErrors, names: m.toolErrorNames.join(', ') }))
  if (m.httpErrors > 0) out.push(insight('httpErrors', 'error', { n: m.httpErrors }))
  if (m.llmErrors > 0) out.push(insight('llmErrors', 'error', { n: m.llmErrors }))
  if (m.agentErrors > 0) out.push(insight('agentErrors', 'error', { n: m.agentErrors }))
  if (m.emptyResponses > 0) out.push(insight('emptyResponse', 'warning', { n: m.emptyResponses }))
  if (m.fillers > 0) out.push(insight('fillers', 'info', { n: m.fillers, total: m.userTurns }))
  if (m.interruptions > 0) out.push(insight('interruptions', 'info', { n: m.interruptions }))
  if (m.repeatedQuestions > 0) out.push(insight('repeatedQuestion', 'warning', { n: m.repeatedQuestions }))
  if (m.fallbacks > 0) out.push(insight('fallbacks', 'warning', { n: m.fallbacks }))
  return [...out].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}
