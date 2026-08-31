import { Router, Request, Response } from 'express';
import { collectStatus } from '../services/status';
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

export default router;
