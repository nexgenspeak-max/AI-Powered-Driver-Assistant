import { Router, Request, Response } from 'express';
import * as driverContextService from '../services/driverContextService';
import * as customerService from '../services/customerService';
import * as tripService from '../services/tripService';
import { phoneVariants } from '../utils/phone';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    return res.json(await customerService.listAll());
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

function isAdmin(req: Request): boolean {
  return req.user?.role === 'admin' || req.user?.role === 'super_admin';
}

function sendError(res: Response, err: unknown) {
  if (err instanceof customerService.CustomerError) {
    return res.status(err.status).json({ detail: err.message, code: err.code });
  }
  return res.status(500).json({ error: String(err) });
}

router.post('/', async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ detail: 'Only admin can create customers' });
  try {
    return res.status(201).json(await customerService.create(req.body ?? {}));
  } catch (err) {
    return sendError(res, err);
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ detail: 'Only admin can edit customers' });
  try {
    return res.json(await customerService.update(req.params.id, req.body ?? {}));
  } catch (err) {
    return sendError(res, err);
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ detail: 'Only admin can delete customers' });
  try {
    const result = await customerService.remove(req.params.id, {
      tripsForPhone: async (phone) => {
        const lists = await Promise.all(phoneVariants(phone).map(v => tripService.listByCustomerPhone(v)));
        const seen = new Map<string, tripService.Trip>();
        for (const t of lists.flat()) if (t.trip_id) seen.set(t.trip_id, t);
        return [...seen.values()];
      },
      invalidate: (trip) => driverContextService.invalidateTripParties(trip as tripService.Trip),
    });
    return res.json(result);
  } catch (err) {
    return sendError(res, err);
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
