import { Router, Request, Response } from 'express';
import * as reminderService from '../services/reminderService';
import * as driverContextService from '../services/driverContextService';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const driverPhone = (req.body.driverId || req.body.driver_phone || req.headers['x-driver-phone']) as string;
    const tripId = req.body.tripId || req.body.trip_id;
    const minutes = Number(req.body.remindBeforeMinutes || req.body.remind_before_minutes || 10);
    if (!driverPhone || !tripId) {
      return res.status(400).json({ detail: 'driverId and tripId required' });
    }
    const reminder = await reminderService.create(driverPhone, tripId, minutes, req.body.type);
    await driverContextService.invalidateDriverContext(driverPhone);
    return res.status(201).json(reminder);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'TRIP_NOT_FOUND') {
      return res.status(404).json({ detail: 'Trip not found' });
    }
    if (message === 'NO_PICKUP_TIME') {
      return res.status(400).json({ detail: 'Trip has no pickup time' });
    }
    return res.status(500).json({ error: message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const driverPhone = (req.body.driverId || req.body.driver_phone || req.headers['x-driver-phone']) as string;
    const minutes = Number(req.body.remindBeforeMinutes ?? req.body.remind_before_minutes);
    if (!driverPhone) return res.status(400).json({ detail: 'driverId or X-Driver-Phone required' });
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240) {
      return res.status(400).json({ detail: 'remindBeforeMinutes must be between 1 and 240' });
    }
    const reminder = await reminderService.update(driverPhone, req.params.id, minutes);
    await driverContextService.invalidateDriverContext(driverPhone);
    return res.json(reminder);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'REMINDER_NOT_FOUND') return res.status(404).json({ detail: 'Reminder not found or already fired' });
    if (message === 'TRIP_NOT_FOUND') return res.status(404).json({ detail: 'Trip not found' });
    if (message === 'NO_PICKUP_TIME') return res.status(400).json({ detail: 'Trip has no pickup time' });
    return res.status(500).json({ error: message });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const driverPhone = req.headers['x-driver-phone'] as string;
    if (!driverPhone) return res.status(400).json({ detail: 'X-Driver-Phone header required' });
    return res.json(await reminderService.list(driverPhone));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
