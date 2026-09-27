import { Router, Request, Response } from 'express';
import * as recordService from '../services/recordService';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    await recordService.save(req.body);
    res.status(201).json({ status: 'saved', call_id: req.body.call_id });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const date = req.query.date ? String(req.query.date) : '';
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ detail: 'date must be YYYY-MM-DD' });
      }
      const pageSize = Math.min(Number(req.query.limit) || 100, 500);
      const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
      return res.json(await recordService.listByDate(date, pageSize, cursor));
    }
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const caller = req.query.caller ? String(req.query.caller) : '';
    if (caller) {
      return res.json(await recordService.listByCaller(caller, limit));
    }
    return res.json(await recordService.listRecent(limit));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/:callId', async (req: Request, res: Response) => {
  try {
    const record = await recordService.get(req.params.callId);
    if (!record) return res.status(404).json({ detail: 'Record not found' });
    return res.json(record);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
