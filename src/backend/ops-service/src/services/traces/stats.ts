import type { TraceEvent } from './events';

/** Speech-to-first-audio at or above this is SLOW (quality-standards §5). */
export const SLOW_TURN_MS = 2000;

export interface TraceSessionStats {
  slowTurns: number;
  avgTtftMs: number | null;
  p95TotalMs: number | null;
  maxPromptTokens: number | null;
  toolErrors: number;
  /** `op` events with ok=false plus `error` events. */
  opErrors: number;
  interruptions: number;
  fillers: number;
}

export interface SessionScan {
  head: TraceEvent | null;
  turns: number;
  llmCalls: number;
  ended: boolean;
  stats: TraceSessionStats;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
}

function average(values: number[]): number | null {
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
}

/** Folds events one at a time so a multi-MB file never sits in memory. */
export function createSessionScanner() {
  let head: TraceEvent | null = null;
  let turns = 0;
  let llmCalls = 0;
  let ended = false;
  let slowTurns = 0;
  let maxPromptTokens: number | null = null;
  let toolErrors = 0;
  let opErrors = 0;
  let interruptions = 0;
  let fillers = 0;
  const responseTtft: number[] = [];
  const metricsTtft: number[] = [];
  const totals: number[] = [];

  const add = (e: TraceEvent): void => {
    head ??= e;
    turns = Math.max(turns, e.turn);
    switch (e.kind) {
      case 'llm_request':
        llmCalls += 1;
        break;
      case 'llm_response': {
        const ttft = num(e.ttft_ms);
        if (ttft !== null) responseTtft.push(ttft);
        break;
      }
      case 'llm_metrics': {
        const ttft = num(e.ttft_ms);
        if (ttft !== null) metricsTtft.push(ttft);
        const tokens = num(e.prompt_tokens);
        if (tokens !== null) maxPromptTokens = Math.max(maxPromptTokens ?? 0, tokens);
        break;
      }
      case 'turn_metrics': {
        const total = num(e.total_ms);
        if (total !== null) totals.push(total);
        if (e.slow === true || (total !== null && total >= SLOW_TURN_MS)) slowTurns += 1;
        break;
      }
      case 'tool':
        if (e.is_error === true) toolErrors += 1;
        break;
      case 'op':
        if (e.ok === false) opErrors += 1;
        if (e.name === 'turn_filler') fillers += 1;
        break;
      case 'error':
        opErrors += 1;
        break;
      case 'speech':
        if (e.interrupted === true) interruptions += 1;
        break;
      case 'session_end':
        ended = true;
        break;
      default:
        break;
    }
  };

  const result = (): SessionScan => ({
    head,
    turns,
    llmCalls,
    ended,
    stats: {
      slowTurns,
      // llm_response and llm_metrics both carry ttft for the same call; prefer one source.
      avgTtftMs: average(responseTtft.length ? responseTtft : metricsTtft),
      p95TotalMs: percentile(totals, 0.95),
      maxPromptTokens,
      toolErrors,
      opErrors,
      interruptions,
      fillers,
    },
  });

  return { add, result };
}
