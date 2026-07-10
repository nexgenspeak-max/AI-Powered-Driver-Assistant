import { Router, Request, Response } from 'express';
import * as driverContextService from '../services/driverContextService';
import * as customerService from '../services/customerService';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    return res.json(await customerService.listAll());
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/me/context', async (req: Request, res: Response) => {
  try {
    const customerPhone = req.headers['x-customer-phone'] as string;
    if (!customerPhone) return res.status(400).json({ detail: 'X-Customer-Phone header required' });
    const fresh = req.query.fresh === 'true';
    return res.json(await driverContextService.getCustomerContext(customerPhone, fresh));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
