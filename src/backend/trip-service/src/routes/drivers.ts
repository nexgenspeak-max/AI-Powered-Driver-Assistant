import { Router, Request, Response } from 'express';
import * as driverService from '../services/driverService';
import * as tripService from '../services/tripService';
import * as earningsService from '../services/earningsService';
import * as driverContextService from '../services/driverContextService';
import { phoneVariants } from '../utils/phone';

const router = Router();

const UPCOMING_STATUSES = new Set(['pending', 'notified', 'calling', 'confirmed']);
const ACTIVE_STATUSES = new Set(['confirmed', 'notified', 'calling', 'arrived_pickup', 'picked_up']);

async function tripsForDriver(phone: string) {
  const seen = new Set<string>();
  const trips: Awaited<ReturnType<typeof tripService.listByDriver>> = [];
  for (const variant of phoneVariants(phone)) {
    for (const trip of await tripService.listByDriver(variant, 50)) {
      if (trip.trip_id && !seen.has(trip.trip_id)) {
        seen.add(trip.trip_id);
        trips.push(trip);
      }
    }
  }
  return trips.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    return res.json(await driverService.listAll());
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/online', async (_req: Request, res: Response) => {
  try {
    const all = await driverService.listAll();
    return res.json(driverService.listOnline(all));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/me/trips/upcoming', async (req: Request, res: Response) => {
  try {
    const driverPhone = req.headers['x-driver-phone'] as string;
    if (!driverPhone) return res.status(400).json({ detail: 'X-Driver-Phone header required' });
    const trips = (await tripsForDriver(driverPhone)).filter(t => UPCOMING_STATUSES.has(t.status));
    return res.json(trips);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/me/trips/current', async (req: Request, res: Response) => {
  try {
    const driverPhone = req.headers['x-driver-phone'] as string;
    if (!driverPhone) return res.status(400).json({ detail: 'X-Driver-Phone header required' });
    const ctx = await driverContextService.getDriverContext(driverPhone);
    const active = ctx.current_trip as tripService.Trip | null;
    if (!active) return res.status(404).json({ detail: 'No active trip' });
    return res.json(active);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/me/context', async (req: Request, res: Response) => {
  try {
    const driverPhone = req.headers['x-driver-phone'] as string;
    if (!driverPhone) return res.status(400).json({ detail: 'X-Driver-Phone header required' });
    const fresh = req.query.fresh === 'true';
    return res.json(await driverContextService.getDriverContext(driverPhone, fresh));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/me/profile', async (req: Request, res: Response) => {
  try {
    const driverPhone = req.headers['x-driver-phone'] as string;
    if (!driverPhone) return res.status(400).json({ detail: 'X-Driver-Phone header required' });
    const ctx = await driverContextService.getDriverContext(driverPhone);
    return res.json(ctx.driver_profile);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/me/earnings/today', async (req: Request, res: Response) => {
  try {
    const driverPhone = req.headers['x-driver-phone'] as string;
    if (!driverPhone) return res.status(400).json({ detail: 'X-Driver-Phone header required' });
    const ctx = await driverContextService.getDriverContext(driverPhone);
    return res.json(ctx.today_earnings);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/me/earnings/summary', async (req: Request, res: Response) => {
  try {
    const driverPhone = req.headers['x-driver-phone'] as string;
    if (!driverPhone) return res.status(400).json({ detail: 'X-Driver-Phone header required' });
    const period = (req.query.period as 'week' | 'month') || 'week';
    return res.json(await earningsService.summaryForDriver(driverPhone, period));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/me/bonuses', async (_req: Request, res: Response) => {
  try {
    return res.json(earningsService.activeBonuses());
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.patch('/me/status', async (req: Request, res: Response) => {
  try {
    const driverPhone = req.headers['x-driver-phone'] as string;
    if (!driverPhone) return res.status(400).json({ detail: 'X-Driver-Phone header required' });
    const online = req.body.online ?? req.body.status === 'online';
    const status = online ? 'online' : 'offline';
    const updated = await driverService.update(driverPhone, { status });
    if (!updated) return res.status(404).json({ detail: 'Driver not found' });
    await driverContextService.invalidateDriverContext(driverPhone);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/:phone', async (req: Request, res: Response) => {
  try {
    const driver = await driverService.get(req.params.phone);
    if (!driver) return res.status(404).json({ detail: 'Driver not found' });
    return res.json(driver);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.patch('/:phone', async (req: Request, res: Response) => {
  try {
    const driver = await driverService.get(req.params.phone);
    if (!driver) return res.status(404).json({ detail: 'Driver not found' });

    const fields: Record<string, unknown> = {};
    for (const k of ['name', 'fcm_token', 'status']) {
      if (req.body[k] != null) fields[k] = req.body[k];
    }
    if (!Object.keys(fields).length) return res.json(driver);
    if (fields.status && !['online', 'offline'].includes(fields.status as string)) {
      return res.status(400).json({ detail: 'status must be online or offline' });
    }
    const updated = await driverService.update(req.params.phone, fields);
    await driverContextService.invalidateDriverContext(req.params.phone);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
