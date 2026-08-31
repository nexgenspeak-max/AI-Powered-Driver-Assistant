import { config } from '../../config';
import { getLogger } from '../logger';

const log = getLogger('records');

export type CallTurn = {
  role: string;
  text: string;
  ts: number;
};

export type CallRecord = {
  call_id: string;
  caller: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  turns: CallTurn[];
  summary: string;
  stt_provider?: string;
  llm_provider?: string;
  llm_model?: string;
};

type FetchFn = typeof fetch;

export async function listRecords(
  opts: { caller?: string; limit?: number } = {},
  deps: { fetchFn?: FetchFn; baseUrl?: string } = {},
): Promise<CallRecord[]> {
  const fetchFn = deps.fetchFn ?? fetch;
  const base = deps.baseUrl ?? config.callLoggerUrl;
  const params = new URLSearchParams();
  if (opts.caller) {
    params.set('caller', opts.caller);
  }
  params.set('limit', String(opts.limit ?? 20));
  const t0 = Date.now();
  const url = `${base}/api/v1/records?${params.toString()}`;
  const res = await fetchFn(url);
  const duration_ms = Date.now() - t0;
  if (!res.ok) {
    log.error('list failed', { ok: false, status: res.status, duration_ms });
    throw new Error(`call-logger http_${res.status}`);
  }
  log.info('list', { ok: true, duration_ms });
  return res.json() as Promise<CallRecord[]>;
}

export async function getRecord(
  callId: string,
  deps: { fetchFn?: FetchFn; baseUrl?: string } = {},
): Promise<CallRecord | null> {
  const fetchFn = deps.fetchFn ?? fetch;
  const base = deps.baseUrl ?? config.callLoggerUrl;
  const t0 = Date.now();
  const res = await fetchFn(`${base}/api/v1/records/${encodeURIComponent(callId)}`);
  const duration_ms = Date.now() - t0;
  if (res.status === 404) {
    log.info('get miss', { ok: true, duration_ms });
    return null;
  }
  if (!res.ok) {
    log.error('get failed', { ok: false, status: res.status, duration_ms });
    throw new Error(`call-logger http_${res.status}`);
  }
  log.info('get', { ok: true, duration_ms });
  return res.json() as Promise<CallRecord>;
}
