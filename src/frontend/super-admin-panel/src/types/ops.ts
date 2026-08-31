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
  'auth-service',
  'trip-service',
  'call-center',
  'call-logger',
  'ops-service',
  'voice-agent',
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
