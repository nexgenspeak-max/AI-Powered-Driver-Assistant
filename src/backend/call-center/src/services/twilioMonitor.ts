import * as fs from 'fs';
import * as path from 'path';

const LOG_DIR = path.resolve(__dirname, '../../data');
const LOG_FILE = path.join(LOG_DIR, 'twilio_events.jsonl');

export function logEvent(source: string, payload: Record<string, string>): void {
  const row = { ts: new Date().toISOString(), source, ...payload };
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFileSync(LOG_FILE, JSON.stringify(row) + '\n', 'utf-8');
  console.log(`[twilio] ${source} CallSid=${payload.CallSid ?? '?'} status=${payload.CallStatus ?? payload.status ?? ''}`);
}

export function readEvents(limit = 200, callSid?: string): Record<string, string>[] {
  if (!fs.existsSync(LOG_FILE)) return [];
  const rows = fs.readFileSync(LOG_FILE, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map(line => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
  const filtered = callSid ? rows.filter(r => r.CallSid === callSid) : rows;
  return filtered.slice(-limit);
}
