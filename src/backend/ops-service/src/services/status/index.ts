import { config, type HttpServiceId } from '../../config';
import { resolveLogFiles } from '../logs';
import { httpProbe } from './httpProbe';
import { logFreshnessProbe } from './logFreshness';
import { ecsServiceProbe } from './ecsProbe';
import type { HealthProbe, ProbeResult } from './types';

export type { ProbeResult, HealthProbe } from './types';
export { httpProbe } from './httpProbe';
export { logFreshnessProbe } from './logFreshness';

const HTTP_IDS: HttpServiceId[] = [
  'identity-service',
  'external-api-service',
  'external-channel-service',
  'call-records-service',
];

export function defaultProbes(): HealthProbe[] {
  const http: HealthProbe[] = HTTP_IDS.map((id) => () => httpProbe(id, config.healthUrls[id]));
  // Local: the worker writes log files; deployed: ECS reports running tasks.
  const voice: HealthProbe = config.logSource === 'cloudwatch'
    ? () => ecsServiceProbe('llm-orchestrator')
    : async () => logFreshnessProbe('llm-orchestrator', resolveLogFiles('llm-orchestrator'), config.logFreshnessMs);
  const self: HealthProbe = async () => ({ id: 'ops-service', ok: true, latency_ms: 0, detail: 'self' });
  return [...http, self, voice];
}

export async function collectStatus(probes: HealthProbe[] = defaultProbes()): Promise<ProbeResult[]> {
  return Promise.all(probes.map((probe) => probe()));
}
