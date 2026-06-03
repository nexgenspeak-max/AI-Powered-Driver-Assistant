export interface CallTurn {
  role: 'user' | 'assistant'
  text: string
  ts: number
}

export interface CallLog {
  call_id: string
  caller: string
  started_at: string
  ended_at: string
  duration_seconds: number
  turns: CallTurn[]
  summary: string
  stt_provider: string
  llm_model: string
}
