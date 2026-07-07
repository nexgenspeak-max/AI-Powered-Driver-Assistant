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

// Once a trip lands in one of these, it's done — no more status changes.
// The customer/driver must book a new trip instead.
const CANCELLED_STATUSES = new Set(['rejected', 'cancelled', 'CANCELLED_BY_DRIVER']);

// TODO(temporary): there's no real driver-matching/dispatch logic yet, so every
// booking with no explicit driver_phone is auto-assigned to this hardcoded number.
// Replace with real nearest-available-driver selection once that's built.


router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const route = await mapsService.getRoute(body.pickup_address, body.dropoff_address, config.googleMapsApiKey);
    const trip = await tripService.create({
      ...body,
      driver_phone: body.driver_phone || config.phoneDriver,
      // Link the trip back to whichever authenticated account created it.
      ...(req.user ? { id_account: req.user.sub } : {}),
      distance_km: route.distance_km ?? 0,
      eta_minutes: route.eta_minutes ?? 0,
      traffic_note: route.traffic_note ?? '',
      route_summary: route.summary ?? '',
    });
    // Mark it 'notified' right away so it shows up on the assigned driver's dashboard.
    const notified = await tripService.updateStatus(trip.trip_id, 'notified');
    await driverContextService.invalidateTripParties(notified ?? trip);
    return res.status(201).json(notified ?? trip);
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
    if (CANCELLED_STATUSES.has(trip.status)) {
      return res.status(409).json({
        detail: `Trip already ${trip.status} — cannot change status anymore. Book a new trip instead.`,
      });
    }
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
    const driverPhone = trip.driver_phone || req.body.driver_phone;
    if (!driverPhone) {
      return res.status(400).json({ detail: 'driver_phone is required to dispatch' });
    }
    const roomName = await dispatchService.dispatchCall({ ...trip, driver_phone: driverPhone } as TripData);
    const updated = await tripService.updateStatus(req.params.tripId, 'calling', { driver_phone: driverPhone, room_name: roomName });
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
