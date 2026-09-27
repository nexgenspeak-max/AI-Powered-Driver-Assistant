/** Daily operations report — owned and stored by ops-service (table ops-daily-reports). */

export interface SessionMetrics {
  schema: number;
  mode: string;
  turns: number;
  latency_ms: { samples: (number | null)[]; mean: number | null; p50: number | null; p95: number | null; max: number | null; slow: number };
  fillers: number;
  tools: { total: number; errors: number; by_name: Record<string, { ok: number; error: number }> };
  http: { total: number; errors: number; by_error: Record<string, number> };
  fallbacks: Record<string, number>;
  errors: Record<string, number>;
}

export interface ReportRecord {
  call_id: string;
  caller: string;
  started_at: string;
  duration_seconds: number;
  turns: { role: string; text: string; ts: number }[];
  mode?: string;
  metrics?: SessionMetrics;
}

export interface JudgeResult {
  method: string;          // how "correct" was decided
  model: string;
  sample_size: number;
  correct: number;
  incorrect: number;
  unclear: number;
  correct_rate: number | null;   // correct / (correct + incorrect)
  examples_incorrect: { call_id: string; user: string; assistant: string; reason: string }[];
}

export interface DailyReport {
  report_date: string;             // YYYY-MM-DD, Vietnam time
  timezone: 'Asia/Ho_Chi_Minh';
  generated_at: string;
  activity: {
    sessions: number;
    sessions_by_mode: Record<string, number>;
    drivers_served: number;         // distinct callers in driver / outbound sessions
    customers_served: number;       // distinct callers in customer sessions
    customer_calls: number;         // customer legs placed from a driver session
    turns: number;
    total_duration_s: number;
    avg_session_s: number | null;
  };
  latency_ms: {
    turns_measured: number;
    mean: number | null;
    p50: number | null;
    p95: number | null;
    max: number | null;
    slow_ratio: number | null;      // share of turns ≥ 2 s
    meets_nfr02: boolean | null;    // p95 ≤ 2000 ms
  };
  fillers: { count: number; per_turn: number | null };
  accuracy: {
    tool_calls: number;
    tool_errors: number;
    tool_success_rate: number | null;
    http_calls: number;
    http_errors: number;
    http_error_rate: number | null;
    judged: JudgeResult | null;
  };
  errors: {
    total: number;
    by_kind: Record<string, number>;
    top_http: { key: string; count: number }[];
    sessions_with_errors: number;
  };
  fallbacks: { total: number; by_provider: Record<string, number> };
  coverage: { records: number; with_metrics: number; notes: string[] };
}
