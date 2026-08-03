import { Router, Request, Response } from 'express';
import * as tripService from '../services/tripService';
import * as mapsService from '../services/mapsService';
import * as dispatchService from '../services/dispatchService';
import * as driverContextService from '../services/driverContextService';
import { authServiceClient } from '../services/authServiceClient';
import { config } from '../config';
import { TripData } from '../services/dispatchService';
import { cacheSet, cacheGet, driverLocationKey, tripProximityNotifiedKey, geoAddDriver } from '../cache/redis';
import { distanceMeters } from '../utils/geo';
import * as callService from '../services/callService';
import * as dispatchOrchestrator from '../services/dispatchOrchestrator';

const router = Router();

const ALLOWED_STATUSES = new Set([
  'pending', 'notified', 'calling', 'confirmed', 'rejected', 'no_answer', 'completed',
  'cancelled', 'cancelled_by_driver', 'no_show', 'arrived_pickup', 'picked_up',
  // Auto-match only (POST /trips/auto-match) — every idle/ride-pool candidate
  // within radius was tried and none accepted. Distinct from `no_answer`
  // (a single candidate's own timeout) so customer-app can tell "still
  // retrying" apart from "search exhausted, nothing left to try".
  'no_driver_found',
]);

// Once a trip lands in one of these, it's done — no more status changes.
// The customer/driver must book a new trip instead. `rejected`/`no_answer`
// are deliberately NOT here even though they sound terminal — POST
// /:tripId/dispatch explicitly retries from either (redispatches to another
// driver), so a rejected/unanswered trip is still "alive" from the
// customer's point of view, just waiting on a different driver.
const CANCELLED_STATUSES = new Set(['cancelled', 'cancelled_by_driver']);

// Who may cancel, and from which states — enforced here (not just by which
// button the FE happens to show), so a customer can't cancel a trip already
// past pickup and a driver can't back out via `cancelled_by_driver` before
// they've actually accepted it:
//   - Customer can cancel (`cancelled`) any time before a driver has
//     committed — pending/notified/calling/confirmed, plus rejected/
//     no_answer (this specific driver didn't take it, but the trip itself
//     is still pending redispatch, not resolved — the customer shouldn't
//     have to wait out a retry they no longer want). Once a driver has
//     moved past confirmed (arrived_pickup/picked_up), only the driver can
//     back out.
//   - Driver can cancel (`cancelled_by_driver`) only after they've confirmed
//     the trip — confirmed/arrived_pickup/picked_up. They can't "cancel" a
//     trip they haven't accepted yet; that's `reject`.
const CANCEL_RULES: Partial<Record<string, { role: 'customer' | 'driver'; fromStatuses: Set<string> }>> = {
  cancelled: {
    role: 'customer',
    fromStatuses: new Set(['pending', 'notified', 'calling', 'confirmed', 'rejected', 'no_answer']),
  },
  cancelled_by_driver: { role: 'driver', fromStatuses: new Set(['confirmed', 'arrived_pickup', 'picked_up']) },
};

// TODO(temporary): there's no real driver-matching/dispatch logic yet, so every
// booking with no explicit driver_phone is auto-assigned to this hardcoded number.
// Replace with real nearest-available-driver selection once that's built.

// Requests from a real customer session carry their own account id in the token.
// Service callers (voice-agent, admin panel) authenticate as themselves, not the
// customer, so their token's `sub` must never be used as the trip's owner — look
// the customer up in the accounts table by phone instead.
async function resolveCustomerAccountId(req: Request, customerPhone?: string): Promise<string | undefined> {
  if (req.user?.role === 'customer') return req.user.sub;
  if (!customerPhone) return undefined;
  const { data } = await authServiceClient.getByPhone<{ id: string }>(customerPhone, 'customer');
  return data?.id;
}

function normalizePhone(phone?: string): string {
  if (!phone) return '';
  let p = phone.trim().replace(/^\+/, '');
  if (p.startsWith('84')) p = `0${p.slice(2)}`;
  return p;
}

// Service callers (voice-agent, admin panel) sign their own token with role='admin'
// and act on behalf of whoever is on the call — they're trusted, so they bypass this.
// Real driver/customer sessions can only touch their own trip.
function isTripOwner(req: Request, trip: tripService.Trip): boolean {
  const user = req.user;
  if (!user || user.role === 'admin') return true;
  if (user.role === 'driver') {
    return !!user.phone && normalizePhone(user.phone) === normalizePhone(trip.driver_phone);
  }
  if (user.role === 'customer') {
    if (trip.id_account) return trip.id_account === user.sub;
    return !!user.phone && normalizePhone(user.phone) === normalizePhone(trip.customer_phone);
  }
  return false;
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const route = await mapsService.getRoute(body.pickup_address, body.dropoff_address);
    const idAccount = await resolveCustomerAccountId(req, body.customer_phone);
    const trip = await tripService.create({
      ...body,
      driver_phone: body.driver_phone || config.phoneDriver,
      ...(idAccount ? { id_account: idAccount } : {}),
      distance_km: route.distance_km ?? 0,
      eta_minutes: route.eta_minutes ?? 0,
      traffic_note: route.traffic_note ?? '',
      route_summary: route.summary ?? '',
      pickup_lat: route.pickup_lat,
      pickup_lng: route.pickup_lng,
      dropoff_lat: route.dropoff_lat,
      dropoff_lng: route.dropoff_lng,
    });
    // Mark it 'notified' right away so it shows up on the assigned driver's dashboard.
    const notified = await tripService.updateStatus(trip.trip_id, 'notified');
    await driverContextService.invalidateTripParties(notified ?? trip);
    return res.status(201).json(notified ?? trip);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Separate booking flow from POST / above — that one takes a specific
// driver_phone and assigns it directly (unchanged, still used e.g. when the
// caller already knows which driver). This one has no driver_phone at all:
// it searches nearby drivers (idle first, then same-direction ride-pool)
// and offers the trip to the best candidate, cascading to the next on a
// 15s timeout — see dispatchOrchestrator.ts.
router.post('/auto-match', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const route = await mapsService.getRoute(body.pickup_address, body.dropoff_address);
    if (typeof route.pickup_lat !== 'number' || typeof route.pickup_lng !== 'number') {
      return res.status(422).json({ detail: 'Could not resolve pickup coordinates for this address' });
    }

    const idAccount = await resolveCustomerAccountId(req, body.customer_phone);
    const trip = await tripService.create({
      ...body,
      ...(idAccount ? { id_account: idAccount } : {}),
      distance_km: route.distance_km ?? 0,
      eta_minutes: route.eta_minutes ?? 0,
      traffic_note: route.traffic_note ?? '',
      route_summary: route.summary ?? '',
      pickup_lat: route.pickup_lat,
      pickup_lng: route.pickup_lng,
      dropoff_lat: route.dropoff_lat,
      dropoff_lng: route.dropoff_lng,
    });

    const dispatched = await dispatchOrchestrator.startAutoMatch(trip);
    return res.status(201).json(dispatched);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const status = req.query.status ? String(req.query.status) : '';
    const driverPhone = req.query.driver_phone ? String(req.query.driver_phone) : '';
    // A logged-in customer can only ever list their own trips — the account id comes
    // from their verified token, never from the query string, so one customer can't
    // page through another's history by guessing an id_account/phone value.
    // Service callers (admin panel) authenticate as 'admin' and may look up any account.
    const idAccount = req.user?.role === 'customer'
      ? req.user.sub
      : (req.query.id_account ? String(req.query.id_account) : '');

    if (driverPhone && status) return res.json(await tripService.listByDriverAndStatus(driverPhone, status, limit));
    if (driverPhone) return res.json(await tripService.listByDriver(driverPhone, limit));
    if (idAccount) return res.json(await tripService.listByAccount(idAccount, limit));
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
    const status = typeof req.body.status === 'string' ? req.body.status.toLowerCase() : req.body.status;
    if (!ALLOWED_STATUSES.has(status)) {
      return res.status(400).json({ detail: `status must be one of ${[...ALLOWED_STATUSES].join(', ')}` });
    }
    const trip = await tripService.get(req.params.tripId);
    if (!trip) return res.status(404).json({ detail: 'Trip not found' });
    if (!isTripOwner(req, trip)) {
      return res.status(403).json({ detail: 'Not authorized to modify this trip' });
    }
    if (CANCELLED_STATUSES.has(trip.status)) {
      return res.status(409).json({
        detail: `Trip already ${trip.status} — cannot change status anymore. Book a new trip instead.`,
      });
    }
    const cancelRule = CANCEL_RULES[status];
    if (cancelRule) {
      const role = req.user?.role;
      if (role && role !== 'admin' && role !== cancelRule.role) {
        return res.status(403).json({ detail: `Only the ${cancelRule.role} can cancel a trip this way` });
      }
      if (!cancelRule.fromStatuses.has(trip.status)) {
        return res.status(409).json({
          detail: `Cannot set status=${status} from status=${trip.status}`,
        });
      }
    }
    const updated = await tripService.updateStatus(req.params.tripId, status);
    await driverContextService.invalidateTripParties(updated);
    // Harmless no-op for trips from the plain POST / flow (nothing was ever
    // tracked for them) — only actually clears bookkeeping for auto-match
    // trips once a driver accepts, so a later stray timeout can't re-offer.
    if (status === 'confirmed') dispatchOrchestrator.cancelPendingOffer(req.params.tripId);
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

// Driver's live GPS ping while en route to pickup — separate from the
// static GET /:tripId/location above (which only returns stored trip
// fields). Stored in Redis only (short TTL) since it's high-frequency,
// ephemeral state, not part of the durable trip record.
router.post('/:tripId/location', async (req: Request, res: Response) => {
  try {
    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ detail: 'lat and lng must be numbers' });
    }

    const trip = await tripService.get(req.params.tripId);
    if (!trip) return res.status(404).json({ detail: 'Trip not found' });
    if (!isTripOwner(req, trip)) {
      return res.status(403).json({ detail: 'Not authorized to update this trip' });
    }

    await cacheSet(driverLocationKey(trip.trip_id), { lat, lng, updated_at: new Date().toISOString() }, 120);
    if (trip.driver_phone) await geoAddDriver(trip.driver_phone, lat, lng);

    await maybeNotifyCustomerOfProximity(trip, { lat, lng });

    return res.json({ status: 'ok' });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Fires the "driver is close to pickup" call at most once per trip — the
// dedupe flag is what makes this safe to call on every single GPS ping
// without spamming the customer.
async function maybeNotifyCustomerOfProximity(
  trip: tripService.Trip,
  driverCoords: { lat: number; lng: number },
): Promise<void> {
  if (typeof trip.pickup_lat !== 'number' || typeof trip.pickup_lng !== 'number') return;
  if (!trip.driver_phone || !trip.customer_phone) return;

  const distance = distanceMeters(driverCoords, { lat: trip.pickup_lat, lng: trip.pickup_lng });
  if (distance > config.proximityAlertMeters) return;

  const notifiedKey = tripProximityNotifiedKey(trip.trip_id);
  if (await cacheGet(notifiedKey)) return;
  // Set the flag before dialing (not after) so two near-simultaneous pings
  // can't both pass the cacheGet check above and double-dial.
  await cacheSet(notifiedKey, true, 3600);

  try {
    await callService.startCustomerCall({
      driverPhone: trip.driver_phone,
      customerPhone: trip.customer_phone,
      tripId: trip.trip_id,
      mode: 'background',
      customerName: trip.customer_name,
      pickupAddress: trip.pickup_address,
      customMessage: 'Tài xế sắp đến điểm đón, vui lòng ra cổng hoặc đường lớn để tài xế dễ đón bạn nhé.',
    });
  } catch (err) {
    console.warn(`[trips] proximity call failed for trip=${trip.trip_id}:`, err);
  }
}

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
