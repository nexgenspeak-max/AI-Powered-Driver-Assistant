import { Router, Request, Response } from 'express';
import { loadAgentSnapshot, loadPromptsSnapshot } from '../services/agent';
import { getLogger } from '../services/logger';

const router = Router();
const log = getLogger('agent');

router.get('/prompts', (_req: Request, res: Response) => {
  const started = Date.now();
  try {
    const snapshot = loadPromptsSnapshot();
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
    const snapshot = loadAgentSnapshot();
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
