import * as path from 'path';
import { config } from '../../config';
import { authHeaders } from '../serviceToken';
import { getLogger } from '../logger';
import { aggregate, exchanges, sample } from './aggregate';
import { judge } from './judge';
import { DynamoReportStore, FileReportStore, ReportStore } from './store';
import { DailyReport, ReportRecord } from './types';

const log = getLogger('reports');
const VN_OFFSET_MS = 7 * 3600 * 1000;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const store: ReportStore = config.reportsTable
  ? new DynamoReportStore(config.reportsTable, config.awsRegion)
  : new FileReportStore(path.resolve(__dirname, '../../../data/reports'));

/** Vietnam calendar day `offsetDays` from now (0 = today, -1 = yesterday). */
export function vnDate(offsetDays = 0, now = Date.now()): string {
  return new Date(now + VN_OFFSET_MS + offsetDays * 86400 * 1000).toISOString().slice(0, 10);
}

/** All call records of one Vietnam day from call-records-service (paginated). */
export async function fetchRecords(date: string, fetchFn: typeof fetch = fetch): Promise<ReportRecord[]> {
  const out: ReportRecord[] = [];
  let cursor: string | null = null;
  do {
    const params = new URLSearchParams({ date, limit: '500' });
    if (cursor) params.set('cursor', cursor);
    const res = await fetchFn(`${config.callLoggerUrl}/api/v1/records?${params}`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`call-records http_${res.status}`);
    const page = (await res.json()) as { items: ReportRecord[]; next_cursor: string | null };
    out.push(...page.items);
    cursor = page.next_cursor;
  } while (cursor);
  return out;
}

/** Build (or rebuild) and store the report of one day. */
export async function buildDailyReport(date: string): Promise<DailyReport> {
  const t0 = Date.now();
  const records = await fetchRecords(date);
  const report = aggregate(date, records);
  const picked = sample(exchanges(records), config.reportJudgeSample, date);
  try {
    report.accuracy.judged = await judge(
      picked,
      config.reportJudgeApiKey ? { apiKey: config.reportJudgeApiKey, model: config.reportJudgeModel } : null,
    );
    if (!report.accuracy.judged) {
      report.coverage.notes.push('Chưa chấm tỷ lệ trả lời đúng (thiếu OPENAI_API_KEY hoặc không có lượt hội thoại tài xế).');
    }
  } catch (err) {
    report.coverage.notes.push(`Chấm tỷ lệ trả lời đúng thất bại: ${err instanceof Error ? err.message : String(err)}`);
  }
  await store.put(report);
  log.info('built', { ok: true, date, records: records.length, duration_ms: Date.now() - t0 });
  return report;
}

export function getReport(date: string): Promise<DailyReport | null> {
  return store.get(date);
}

export async function listReports(from: string, to: string): Promise<DailyReport[]> {
  const out: DailyReport[] = [];
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let t = start; t <= end && out.length < 93; t += 86400 * 1000) {
    const r = await store.get(new Date(t).toISOString().slice(0, 10));
    if (r) out.push(r);
  }
  return out;
}

/**
 * Local scheduler (ENV=local). On AWS the EventBridge Scheduler invokes the
 * Lambda handler instead (see index.ts). Builds yesterday's report once it is
 * past 00:15 Vietnam time and the report is still missing.
 */
export function startLocalScheduler(intervalMs = 5 * 60 * 1000): NodeJS.Timeout {
  const tick = async () => {
    const vnMinutes = Math.floor(((Date.now() + VN_OFFSET_MS) % 86400000) / 60000);
    if (vnMinutes < 15) return;
    const date = vnDate(-1);
    try {
      if (!(await store.get(date))) await buildDailyReport(date);
    } catch (err) {
      log.error('scheduled build failed', { ok: false, date, error: err instanceof Error ? err.message : String(err) });
    }
  };
  void tick();
  return setInterval(() => void tick(), intervalMs);
}
