import { Router, Request, Response } from 'express';
import * as driverService from '../services/driverService';
import * as tripService from '../services/tripService';

const router = Router();

const UPCOMING_STATUSES = new Set(['pending', 'notified', 'calling', 'confirmed']);
const ACTIVE_STATUSES = new Set(['confirmed', 'notified', 'calling']);

function phoneVariants(phone: string): string[] {
  const p = phone.trim();
  const bare = p.replace(/^\+/, '');
  const variants = [p];
  if (p !== bare) variants.push(bare);
  if (!p.startsWith('+')) variants.push(`+${bare}`);
  return [...new Set(variants)];
}

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

router.post('/', async (req: Request, res: Response) => {
  try {
    const { phone, name, fcm_token = '' } = req.body;
    const existing = await driverService.get(phone);
    if (existing) {
      return res.status(201).json(await driverService.update(phone, { name, fcm_token }));
    }
    return res.status(201).json(await driverService.register(phone, name, fcm_token));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

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
    const trips = await tripsForDriver(driverPhone);
    const active = trips.find(t => ACTIVE_STATUSES.has(t.status));
    if (!active) return res.status(404).json({ detail: 'No active trip' });
    return res.json(active);
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
    return res.json(await driverService.update(req.params.phone, fields));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
