import { Router, Request, Response } from 'express';
import { getRecord, listRecords } from '../services/records';
import { getLogger } from '../services/logger';

const router = Router();
const log = getLogger('records_route');

router.get('/', async (req: Request, res: Response) => {
  const t0 = Date.now();
  try {
    const caller = typeof req.query.caller === 'string' ? req.query.caller : undefined;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const records = await listRecords({ caller, limit });
    log.info('list', { ok: true, duration_ms: Date.now() - t0, count: records.length });
    res.json(records);
  } catch (err) {
    log.error('list failed', { ok: false, error: String(err), duration_ms: Date.now() - t0 });
    res.status(502).json({ detail: 'call-logger unavailable' });
  }
});

router.get('/:callId', async (req: Request, res: Response) => {
  const t0 = Date.now();
  try {
    const record = await getRecord(req.params.callId);
    if (!record) {
      res.status(404).json({ detail: 'Record not found' });
      return;
    }
    log.info('get', { ok: true, duration_ms: Date.now() - t0 });
    res.json(record);
  } catch (err) {
    log.error('get failed', { ok: false, error: String(err), duration_ms: Date.now() - t0 });
    res.status(502).json({ detail: 'call-logger unavailable' });
  }
});

export default router;
