import { Router, Request, Response } from 'express';
import * as driverService from '../services/driverService';
import * as tripService from '../services/tripService';
import * as earningsService from '../services/earningsService';
import * as driverContextService from '../services/driverContextService';
import { phoneVariants } from '../utils/phone';
import { cacheSet, cacheDel, driverLiveLocationKey, driverSessionKey } from '../cache/redis';
import {
  maybeNotifyCustomerOfProximity,
  maybeNotifyCustomerOfDropoffProximity,
  maybeAnnouncePickupArrivalNextStop,
  maybeAnnounceDropoffArrivalNextStop,
} from '../services/proximityService';

const router = Router();

// "Chuyến đang có" của tài xế — chỉ những chuyến THỰC SỰ còn đang diễn ra: chưa tới điểm
// đón (pending/notified/calling/confirmed) hoặc đã đón khách rồi (arrived_pickup/picked_up).
// Dùng whitelist thay vì loại trừ để không lỡ tính nhầm status mới thêm sau này vào "đang có".
// Loại hẳn: cancelled/cancelled_by_driver (đã hủy), completed (đã xong), và — quan trọng —
// rejected/no_answer (tài xế đã từ chối/không bắt máy, chuyến không còn thuộc tài xế này nữa)
// cùng no_show (khách không ra, chuyến coi như khép lại phía tài xế).
const DRIVER_ACTIVE_STATUSES = new Set(['pending', 'notified', 'calling', 'confirmed', 'arrived_pickup', 'picked_up']);
// Accepted trips only — mirrors driverContextService.ts's IN_PROGRESS. Used
// to scope the proximity-call check in POST /me/location below.
const IN_PROGRESS_STATUSES = new Set(['confirmed', 'arrived_pickup', 'picked_up']);

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
    const trips = (await tripsForDriver(driverPhone)).filter(t => DRIVER_ACTIVE_STATUSES.has(t.status));
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

// Presence: which room (if any) the driver currently has a voice session
// open in — set by voice-agent's job entrypoint on connect, cleared on
// disconnect (best-effort). Read by driverReachService.reachDriver() to
// decide whether to push a proactive nudge into the open room or dial a
// fresh one. TTL is a self-cleanup backstop only; normal disconnects always
// clear this explicitly via DELETE below.
router.put('/me/session', async (req: Request, res: Response) => {
  try {
    const driverPhone = req.headers['x-driver-phone'] as string;
    if (!driverPhone) return res.status(400).json({ detail: 'X-Driver-Phone header required' });
    const roomName = typeof req.body.room_name === 'string' ? req.body.room_name.trim() : '';
    if (!roomName) return res.status(400).json({ detail: 'room_name is required' });
    await cacheSet(driverSessionKey(driverPhone), { room_name: roomName }, 3 * 3600);
    return res.json({ status: 'ok' });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.delete('/me/session', async (req: Request, res: Response) => {
  try {
    const driverPhone = req.headers['x-driver-phone'] as string;
    if (!driverPhone) return res.status(400).json({ detail: 'X-Driver-Phone header required' });
    await cacheDel(driverSessionKey(driverPhone));
    return res.json({ status: 'ok' });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Driver's periodic GPS ping while online (~every 10 min, driver-app side) —
// NOT tied to a single trip, unlike POST /trips/:tripId/location. Runs the
// same proximity-call checks as that endpoint against every trip the driver
// currently holds, since a driver can have more than one active trip.
router.post('/me/location', async (req: Request, res: Response) => {
  try {
    const driverPhone = req.headers['x-driver-phone'] as string;
    if (!driverPhone) return res.status(400).json({ detail: 'X-Driver-Phone header required' });

    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ detail: 'lat and lng must be numbers' });
    }

    await cacheSet(driverLiveLocationKey(driverPhone), { lat, lng, updated_at: new Date().toISOString() }, 1200);

    // Only trips the driver has actually ACCEPTED — proximity-to-pickup
    // doesn't make sense for a still-pending/notified/calling offer they
    // haven't committed to yet (mirrors driverContextService.ts's IN_PROGRESS).
    const trips = (await tripsForDriver(driverPhone)).filter(t => IN_PROGRESS_STATUSES.has(t.status));
    for (const trip of trips) {
      if (trip.status === 'picked_up') {
        await maybeNotifyCustomerOfDropoffProximity(trip, { lat, lng });
        await maybeAnnounceDropoffArrivalNextStop(trip, { lat, lng });
      } else {
        await maybeNotifyCustomerOfProximity(trip, { lat, lng });
        await maybeAnnouncePickupArrivalNextStop(trip, { lat, lng });
      }
    }

    return res.json({ status: 'ok' });
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
