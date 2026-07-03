import { Router, Request, Response } from 'express';
import * as tripService from '../services/tripService';
import * as mapsService from '../services/mapsService';
import * as dispatchService from '../services/dispatchService';
import { config } from '../config';
import { TripData } from '../services/dispatchService';

const router = Router();

const ALLOWED_STATUSES = new Set(['confirmed', 'rejected', 'no_answer', 'calling', 'notified', 'pending', 'completed']);

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const route = await mapsService.getRoute(body.pickup_address, body.dropoff_address, config.googleMapsApiKey);
    const trip = await tripService.create({
      ...body,
      distance_km: route.distance_km ?? 0,
      eta_minutes: route.eta_minutes ?? 0,
      traffic_note: route.traffic_note ?? '',
      route_summary: route.summary ?? '',
    });
    return res.status(201).json(trip);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const status = req.query.status ? String(req.query.status) : '';
    const driverPhone = req.query.driver_phone ? String(req.query.driver_phone) : '';
    const customerPhone = req.query.customer_phone ? String(req.query.customer_phone) : '';

    if (driverPhone && status) return res.json(await tripService.listByDriverAndStatus(driverPhone, status, limit));
    if (driverPhone) return res.json(await tripService.listByDriver(driverPhone, limit));
    if (customerPhone) return res.json(await tripService.listByCustomer(customerPhone, limit));
    if (status) return res.json(await tripService.listByStatus(status, limit));
    return res.json(await tripService.listRecent(limit));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/:tripId', async (req: Request, res: Response) => {
  try {
    const trip = await tripService.get(req.params.tripId);
    if (!trip) return res.status(404).json({ detail: 'Trip not found' });
    return res.json(trip);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.patch('/:tripId', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!ALLOWED_STATUSES.has(status)) {
      return res.status(400).json({ detail: `status must be one of ${[...ALLOWED_STATUSES].join(', ')}` });
    }
    const trip = await tripService.get(req.params.tripId);
    if (!trip) return res.status(404).json({ detail: 'Trip not found' });
    return res.json(await tripService.updateStatus(req.params.tripId, status));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.post('/:tripId/dispatch', async (req: Request, res: Response) => {
  try {
    const trip = await tripService.get(req.params.tripId);
    if (!trip) return res.status(404).json({ detail: 'Trip not found' });
    if (!['pending', 'notified', 'rejected', 'no_answer'].includes(trip.status)) {
      return res.status(409).json({ detail: `Cannot dispatch trip with status=${trip.status}` });
    }
    const roomName = await dispatchService.dispatchCall(trip as TripData);
    return res.json(await tripService.updateStatus(req.params.tripId, 'calling', { room_name: roomName }));
  } catch (err) {
    return res.status(500).json({ detail: String(err) });
  }
});

router.post('/:tripId/notify', async (req: Request, res: Response) => {
  try {
    const trip = await tripService.get(req.params.tripId);
    if (!trip) return res.status(404).json({ detail: 'Trip not found' });
    return res.json(await tripService.updateStatus(req.params.tripId, 'notified'));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
