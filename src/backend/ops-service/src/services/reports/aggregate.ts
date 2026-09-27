import { DailyReport, ReportRecord } from './types';

const SLOW_MS = 2000;
const DRIVER_MODES = new Set(['driver', 'outbound']);

/**
 * Session mode of a record. Records written before the agent sent `mode`
 * still carry it in the LiveKit room name used as call_id (same shapes as
 * llm-orchestrator app/agent/session.py): driver-* in-app/inbound,
 * trip-* SIP outbound, customer-* customer web, custcall-* customer leg.
 */
export function modeOf(r: ReportRecord): string {
  const explicit = r.mode ?? r.metrics?.mode;
  if (explicit) return explicit;
  const prefix = r.call_id.split('-')[0];
  if (prefix === 'driver') return 'driver';
  if (prefix === 'trip') return 'outbound';
  if (prefix === 'customer') return 'customer';
  if (prefix === 'custcall') return 'customer_call';
  return 'unknown';
}

function percentile(sorted: number[], q: number): number | null {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))));
  return sorted[idx];
}

function ratio(num: number, den: number): number | null {
  return den > 0 ? Math.round((num / den) * 10000) / 10000 : null;
}

function add(target: Record<string, number>, src: Record<string, number> | undefined): void {
  for (const [k, v] of Object.entries(src ?? {})) target[k] = (target[k] ?? 0) + v;
}

/** Pure: records of one day → report (without the LLM-judged part). */
export function aggregate(date: string, records: ReportRecord[], now = new Date()): DailyReport {
  const byMode: Record<string, number> = {};
  const drivers = new Set<string>();
  const customers = new Set<string>();
  const latencies: number[] = [];
  const errorsByKind: Record<string, number> = {};
  const httpErrors: Record<string, number> = {};
  const fallbacks: Record<string, number> = {};
  let sessions = 0;
  let customerCalls = 0;
  let turns = 0;
  let duration = 0;
  let withMetrics = 0;
  let fillers = 0;
  let toolCalls = 0;
  let toolErrors = 0;
  let httpCalls = 0;
  let httpErrorCount = 0;
  let sessionsWithErrors = 0;

  for (const r of records) {
    const mode = modeOf(r);
    if (mode.startsWith('customer_')) {
      customerCalls += 1;          // a leg inside a driver session, not a session of its own
      continue;
    }
    sessions += 1;
    byMode[mode] = (byMode[mode] ?? 0) + 1;
    duration += r.duration_seconds || 0;
    turns += r.metrics?.turns ?? r.turns?.filter((t) => t.role === 'user').length ?? 0;
    if (DRIVER_MODES.has(mode) && r.caller) drivers.add(r.caller);
    if (mode === 'customer' && r.caller) customers.add(r.caller);

    const m = r.metrics;
    if (!m) continue;
    withMetrics += 1;
    for (const v of m.latency_ms?.samples ?? []) if (typeof v === 'number') latencies.push(v);
    fillers += m.fillers ?? 0;
    toolCalls += m.tools?.total ?? 0;
    toolErrors += m.tools?.errors ?? 0;
    httpCalls += m.http?.total ?? 0;
    httpErrorCount += m.http?.errors ?? 0;
    add(errorsByKind, m.errors);
    add(httpErrors, m.http?.by_error);
    add(fallbacks, m.fallbacks);
    if (Object.keys(m.errors ?? {}).length) sessionsWithErrors += 1;
  }

  latencies.sort((a, b) => a - b);
  const n = latencies.length;
  const p95 = percentile(latencies, 0.95);
  const notes: string[] = [];
  if (sessions > withMetrics) {
    notes.push(`${sessions - withMetrics} phiên không có chỉ số (bản ghi cũ trước khi tác tử gửi metrics) — chỉ tính vào phần hoạt động.`);
  }
  if (!sessions) notes.push('Không có phiên hội thoại nào trong ngày.');

  return {
    report_date: date,
    timezone: 'Asia/Ho_Chi_Minh',
    generated_at: now.toISOString(),
    activity: {
      sessions,
      sessions_by_mode: byMode,
      drivers_served: drivers.size,
      customers_served: customers.size,
      customer_calls: customerCalls,
      turns,
      total_duration_s: duration,
      avg_session_s: sessions ? Math.round(duration / sessions) : null,
    },
    latency_ms: {
      turns_measured: n,
      mean: n ? Math.round(latencies.reduce((a, b) => a + b, 0) / n) : null,
      p50: percentile(latencies, 0.5),
      p95,
      max: n ? latencies[n - 1] : null,
      slow_ratio: ratio(latencies.filter((v) => v >= SLOW_MS).length, n),
      meets_nfr02: p95 === null ? null : p95 <= SLOW_MS,
    },
    fillers: { count: fillers, per_turn: ratio(fillers, n) },
    accuracy: {
      tool_calls: toolCalls,
      tool_errors: toolErrors,
      tool_success_rate: ratio(toolCalls - toolErrors, toolCalls),
      http_calls: httpCalls,
      http_errors: httpErrorCount,
      http_error_rate: ratio(httpErrorCount, httpCalls),
      judged: null,
    },
    errors: {
      total: Object.values(errorsByKind).reduce((a, b) => a + b, 0),
      by_kind: errorsByKind,
      top_http: Object.entries(httpErrors).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([key, count]) => ({ key, count })),
      sessions_with_errors: sessionsWithErrors,
    },
    fallbacks: { total: Object.values(fallbacks).reduce((a, b) => a + b, 0), by_provider: fallbacks },
    coverage: { records: records.length, with_metrics: withMetrics, notes },
  };
}

/** Driver→assistant exchanges usable for judging (driver sessions only). */
export function exchanges(records: ReportRecord[]): { call_id: string; context: string; user: string; assistant: string }[] {
  const out: { call_id: string; context: string; user: string; assistant: string }[] = [];
  for (const r of records) {
    const mode = modeOf(r);
    if (!DRIVER_MODES.has(mode)) continue;
    const t = r.turns ?? [];
    for (let i = 1; i < t.length; i += 1) {
      if (t[i - 1].role === 'user' && t[i].role === 'assistant') {
        const context = t.slice(Math.max(0, i - 5), i - 1).map((x) => `${x.role === 'user' ? 'Tài xế' : 'Trợ lý'}: ${x.text}`).join('\n');
        out.push({ call_id: r.call_id, context, user: t[i - 1].text, assistant: t[i].text });
      }
    }
  }
  return out;
}

/** Deterministic sample: same day → same sample, so a rebuilt report is reproducible. */
export function sample<T>(items: T[], size: number, seed: string): T[] {
  if (items.length <= size) return items;
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const rand = () => { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0; return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, size);
}
