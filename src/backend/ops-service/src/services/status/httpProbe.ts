import type { ProbeResult } from './types';

export async function httpProbe(
  id: string,
  url: string,
  timeoutMs = 2000,
): Promise<ProbeResult> {
  const t0 = Date.now();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ac.signal });
    const latency_ms = Date.now() - t0;
    if (!res.ok) {
      return { id, ok: false, latency_ms, detail: `http_${res.status}` };
    }
    return { id, ok: true, latency_ms, detail: '-' };
  } catch {
    return { id, ok: false, latency_ms: Date.now() - t0, detail: 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}
