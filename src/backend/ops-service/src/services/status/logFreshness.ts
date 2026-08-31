import { statSync } from 'fs';
import type { ProbeResult } from './types';

export function logFreshnessProbe(
  id: string,
  files: string[],
  maxAgeMs: number,
): ProbeResult {
  const t0 = Date.now();
  if (files.length === 0) {
    return { id, ok: false, latency_ms: 0, detail: 'no_log_file' };
  }

  let newest = 0;
  for (const file of files) {
    try {
      const mtime = statSync(file).mtimeMs;
      if (mtime > newest) {
        newest = mtime;
      }
    } catch {
      // skip missing file
    }
  }

  if (!newest) {
    return { id, ok: false, latency_ms: Date.now() - t0, detail: 'no_log_file' };
  }

  const ageMs = Date.now() - newest;
  if (ageMs > maxAgeMs) {
    return { id, ok: false, latency_ms: Date.now() - t0, detail: `stale_${Math.round(ageMs)}ms` };
  }
  return { id, ok: true, latency_ms: Date.now() - t0, detail: '-' };
}
