import { DescribeServicesCommand, ECSClient } from '@aws-sdk/client-ecs';
import { config } from '../../config';
import type { ProbeResult } from './types';

let client: ECSClient | null = null;

/**
 * Deployed health of the voice agent: ECS keeps DesiredCount tasks running, so
 * "up" means at least one running task. Names follow infra/llm-orchestrator/cfn.yaml.
 */
export async function ecsServiceProbe(id: string): Promise<ProbeResult> {
  const t0 = Date.now();
  const name = `${config.env}-${config.appName}-llm-orchestrator`;
  try {
    client ??= new ECSClient({ region: config.awsRegion });
    const r = await client.send(new DescribeServicesCommand({ cluster: name, services: [name] }));
    const svc = r.services?.[0];
    if (!svc) return { id, ok: false, latency_ms: Date.now() - t0, detail: 'not_deployed' };
    const running = svc.runningCount ?? 0;
    const desired = svc.desiredCount ?? 0;
    return { id, ok: running > 0, latency_ms: Date.now() - t0, detail: `running=${running}/desired=${desired}` };
  } catch (err) {
    return { id, ok: false, latency_ms: Date.now() - t0, detail: (err as { name?: string }).name ?? 'error' };
  }
}
