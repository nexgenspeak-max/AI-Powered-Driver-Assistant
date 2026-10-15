import { Router, Request, Response } from 'express';
import { collectStatus } from '../services/status';
import { diskSnapshot } from '../services/status/disk';
import { config } from '../config';
import { getLogger } from '../services/logger';

const router = Router();
const log = getLogger('status');

router.get('/', async (_req: Request, res: Response) => {
  const t0 = Date.now();
  try {
    const services = await collectStatus();
    log.info('probed', { ok: true, duration_ms: Date.now() - t0, count: services.length });
    res.json({ services });
  } catch (err) {
    log.error('probe failed', { ok: false, error: String(err), duration_ms: Date.now() - t0 });
    res.status(500).json({ detail: 'status probe failed' });
  }
});

// Disk capacity of the log volume and size of the log directories (AVDA-115).
router.get('/disk', async (_req: Request, res: Response) => {
  try {
    const snap = await diskSnapshot([
      { name: 'services', path: config.logDir },
      { name: 'llm-orchestrator', path: config.voiceAgentLogDir },
    ]);
    log.info('disk', { ok: true, used_pct: snap.used_pct });
    res.json(snap);
  } catch (err) {
    log.error('disk snapshot failed', { ok: false, error: String(err) });
    res.status(500).json({ detail: 'disk snapshot failed' });
  }
});

export default router;
