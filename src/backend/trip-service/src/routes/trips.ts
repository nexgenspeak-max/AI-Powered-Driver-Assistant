import { Router, Request, Response } from 'express';
import * as tripService from '../services/tripService';
import * as mapsService from '../services/mapsService';
import * as dispatchService from '../services/dispatchService';
import * as driverContextService from '../services/driverContextService';
import { config } from '../config';
import { TripData } from '../services/dispatchService';

const router = Router();

const ALLOWED_STATUSES = new Set([
  'pending', 'notified', 'calling', 'confirmed', 'rejected', 'no_answer', 'completed',
  'cancelled', 'CANCELLED_BY_DRIVER', 'no_show',
  'ARRIVED_PICKUP', 'PICKED_UP', 'COMPLETED',
]);

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
    await driverContextService.invalidateTripParties(trip);
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
    const updated = await tripService.updateStatus(req.params.tripId, status);
    await driverContextService.invalidateTripParties(updated);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/:tripId/location', async (req: Request, res: Response) => {
  try {
    const trip = await tripService.get(req.params.tripId);
    if (!trip) return res.status(404).json({ detail: 'Trip not found' });
    return res.json({
      trip_id: trip.trip_id,
      pickup_address: trip.pickup_address,
      dropoff_address: trip.dropoff_address,
      eta_minutes: trip.eta_minutes,
      customer_name: trip.customer_name,
      customer_phone: trip.customer_phone,
    });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.post('/:tripId/confirm-with-customer', async (req: Request, res: Response) => {
  try {
    const trip = await tripService.get(req.params.tripId);
    if (!trip) return res.status(404).json({ detail: 'Trip not found' });
    const message = req.body.message || 'Tài xế đã xác nhận chuyến đi và sẽ đến đón đúng giờ.';
    console.info(`[sms-stub] to=${trip.customer_phone} message=${message}`);
    return res.json({ status: 'sent', method: req.body.method || 'sms', message });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.post('/:tripId/no-show', async (req: Request, res: Response) => {
  try {
    const trip = await tripService.get(req.params.tripId);
    if (!trip) return res.status(404).json({ detail: 'Trip not found' });
    const updated = await tripService.updateStatus(req.params.tripId, 'no_show', {
      no_show_reported_at: new Date().toISOString(),
    });
    await driverContextService.invalidateTripParties(updated);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.post('/:tripId/issues', async (req: Request, res: Response) => {
  try {
    const trip = await tripService.get(req.params.tripId);
    if (!trip) return res.status(404).json({ detail: 'Trip not found' });
    const issue = {
      issue_type: req.body.issueType || req.body.issue_type || 'other',
      description: req.body.description || '',
      reported_at: new Date().toISOString(),
    };
    const result = await tripService.updateStatus(req.params.tripId, trip.status, { last_issue: issue });
    await driverContextService.invalidateTripParties(result);
    return res.json({ status: 'recorded', issue, trip: result });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.post('/:tripId/extend-wait', async (req: Request, res: Response) => {
  try {
    const trip = await tripService.get(req.params.tripId);
    if (!trip) return res.status(404).json({ detail: 'Trip not found' });
    const extra = Number(req.body.extraMinutes || req.body.extra_minutes || 5);
    const current = Number(trip.wait_extra_minutes || 0);
    const updated = await tripService.updateStatus(req.params.tripId, trip.status, {
      wait_extra_minutes: current + extra,
    });
    await driverContextService.invalidateTripParties(updated);
    return res.json({
      status: 'extended',
      extra_minutes: extra,
      total_wait_minutes: current + extra,
      trip: updated,
    });
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
    const updated = await tripService.updateStatus(req.params.tripId, 'calling', { room_name: roomName });
    await driverContextService.invalidateTripParties(updated);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ detail: String(err) });
  }
});

router.post('/:tripId/notify', async (req: Request, res: Response) => {
  try {
    const trip = await tripService.get(req.params.tripId);
    if (!trip) return res.status(404).json({ detail: 'Trip not found' });
    const updated = await tripService.updateStatus(req.params.tripId, 'notified');
    await driverContextService.invalidateTripParties(updated);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
