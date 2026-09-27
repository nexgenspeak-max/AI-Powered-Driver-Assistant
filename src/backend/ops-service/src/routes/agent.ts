import { Router, Request, Response } from 'express';
import { loadAgentSnapshot, loadPromptsSnapshot } from '../services/agent';
import { BUNDLED_AGENT } from '../services/agent/bundled';
import { config } from '../config';

/** Deployed: snapshot baked at build time. Local: read llm-orchestrator files live. */
function source() {
  if (config.agentSource !== 'bundled') {
    return { agent: loadAgentSnapshot, prompts: loadPromptsSnapshot };
  }
  if (!BUNDLED_AGENT) throw new Error('agent snapshot was not bundled at deploy time');
  const b = BUNDLED_AGENT;
  return { agent: () => b.agent, prompts: () => b.prompts };
}
import { getLogger } from '../services/logger';

const router = Router();
const log = getLogger('agent');

router.get('/prompts', (_req: Request, res: Response) => {
  const started = Date.now();
  try {
    const snapshot = source().prompts();
    log.info('prompts', {
      ok: true,
      event: 'agent_prompts',
      files: snapshot.prompts.length,
      duration_ms: Date.now() - started,
    });
    res.json(snapshot);
  } catch (err) {
    log.error('prompts failed', { ok: false, event: 'agent_prompts', error: String(err) });
    res.status(500).json({ detail: 'prompts snapshot failed' });
  }
});

router.get('/', (_req: Request, res: Response) => {
  const started = Date.now();
  try {
    const snapshot = source().agent();
    log.info('snapshot', {
      ok: true,
      event: 'agent_snapshot',
      tools: snapshot.tool_count,
      prompts: snapshot.prompt_count,
      locales: snapshot.locales.length,
      duration_ms: Date.now() - started,
    });
    res.json(snapshot);
  } catch (err) {
    log.error('snapshot failed', { ok: false, event: 'agent_snapshot', error: String(err) });
    res.status(500).json({ detail: 'agent snapshot failed' });
  }
});

export default router;
