import { config, type HttpServiceId } from '../../config';
import { resolveLogFiles } from '../logs';
import { httpProbe } from './httpProbe';
import { logFreshnessProbe } from './logFreshness';
import type { HealthProbe, ProbeResult } from './types';

export type { ProbeResult, HealthProbe } from './types';
export { httpProbe } from './httpProbe';
export { logFreshnessProbe } from './logFreshness';

const HTTP_IDS: HttpServiceId[] = [
  'auth-service',
  'trip-service',
  'call-center',
  'call-logger',
];

export function defaultProbes(): HealthProbe[] {
  const http: HealthProbe[] = HTTP_IDS.map((id) => () => httpProbe(id, config.healthUrls[id]));
  const voice: HealthProbe = async () =>
    logFreshnessProbe('voice-agent', resolveLogFiles('voice-agent'), config.logFreshnessMs);
  const self: HealthProbe = async () => ({ id: 'ops-service', ok: true, latency_ms: 0, detail: 'self' });
  return [...http, self, voice];
}

export async function collectStatus(probes: HealthProbe[] = defaultProbes()): Promise<ProbeResult[]> {
  return Promise.all(probes.map((probe) => probe()));
}
