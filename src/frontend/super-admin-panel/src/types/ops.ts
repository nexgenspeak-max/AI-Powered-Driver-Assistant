export type ProbeResult = {
  id: string
  ok: boolean
  latency_ms: number
  detail: string
}

export type CallTurn = {
  role: string
  text: string
  ts: number
}

export type CallRecord = {
  call_id: string
  caller: string
  started_at: string
  ended_at: string
  duration_seconds: number
  turns: CallTurn[]
  summary: string
  stt_provider?: string
  llm_provider?: string
  llm_model?: string
}

export const LOG_SERVICE_IDS = [
  'identity-service',
  'external-api-service',
  'external-channel-service',
  'call-records-service',
  'ops-service',
  'llm-orchestrator',
] as const

export type LogServiceId = (typeof LOG_SERVICE_IDS)[number]

export type LocaleBundle = {
  id: string
  routing: string
  spoken: string
  stt: string
  tts_voice: string
  turn_detection: string
}

export type ToolEntry = {
  name: string
  section: string
  in_schema: boolean
  audience: 'driver' | 'customer'
  locales: string[]
  description: string
}

export type EnvPublicRow = {
  key: string
  value: string
}

export type PromptFile = {
  path: string
  locale: string
  bytes: number
  mtime: string
  text: string
}

export type AgentSnapshot = {
  source: string
  env_mtime: string
  default_locale: string
  locales: LocaleBundle[]
  models: {
    stt: { provider: string; model: string; language: string; google_model: string; google_location: string }
    llm: { provider: string; model: string }
    tts: { provider: string; voice: string; google_voice: string; elevenlabs_model: string }
  }
  livekit: { url: string; agent_name: string }
  flags: { faq_rag: boolean; silence_tracker: boolean }
  env_public: EnvPublicRow[]
  secret_keys: string[]
  tools: ToolEntry[]
  tool_count: number
  prompt_count: number
}

export type PromptsSnapshot = {
  source: string
  prompts: PromptFile[]
}

/** Daily operations report (ops-service GET /api/v1/reports/daily). Mirrors ops-service reports/types.ts. */
export type DailyReport = {
  report_date: string
  timezone: string
  generated_at: string
  activity: {
    sessions: number
    sessions_by_mode: Record<string, number>
    drivers_served: number
    customers_served: number
    customer_calls: number
    turns: number
    total_duration_s: number
    avg_session_s: number | null
  }
  latency_ms: {
    turns_measured: number
    mean: number | null
    p50: number | null
    p95: number | null
    max: number | null
    slow_ratio: number | null
    meets_nfr02: boolean | null
  }
  fillers: { count: number; per_turn: number | null }
  accuracy: {
    tool_calls: number
    tool_errors: number
    tool_success_rate: number | null
    http_calls: number
    http_errors: number
    http_error_rate: number | null
    judged: {
      method: string
      model: string
      sample_size: number
      correct: number
      incorrect: number
      unclear: number
      correct_rate: number | null
      examples_incorrect: { call_id: string; user: string; assistant: string; reason: string }[]
    } | null
  }
  errors: {
    total: number
    by_kind: Record<string, number>
    top_http: { key: string; count: number }[]
    sessions_with_errors: number
  }
  fallbacks: { total: number; by_provider: Record<string, number> }
  coverage: { records: number; with_metrics: number; notes: string[] }
}

export type DiskSnapshot = {
  taken_at: string
  volume_path: string
  total_bytes: number
  free_bytes: number
  used_pct: number
  dirs: { name: string; path: string; bytes: number | null }[]
}
