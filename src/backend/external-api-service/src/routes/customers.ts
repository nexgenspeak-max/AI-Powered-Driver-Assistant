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
    const headerPhone = req.headers['x-customer-phone'] as string | undefined;
    // voice-agent's backend_api calls this as a service caller acting on
    // behalf of whichever phone the call session resolved (not its own
    // bearer identity), so the explicit header still wins when present.
    // customer-app's own home-screen map instead calls this authenticated
    // as the real customer (no header) — falls back to the phone on their
    // JWT in that case.
    const jwtPhone = req.user?.role === 'customer' ? req.user.phone : undefined;
    const customerPhone = headerPhone || jwtPhone;
    if (!customerPhone) return res.status(400).json({ detail: 'X-Customer-Phone header required' });
    const fresh = req.query.fresh === 'true';
    return res.json(await driverContextService.getCustomerContext(customerPhone, fresh));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
