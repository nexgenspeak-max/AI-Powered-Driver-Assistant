import { Router, Request, Response } from 'express';
import * as tripService from '../services/tripService';
import * as mapsService from '../services/mapsService';
import * as dispatchService from '../services/dispatchService';
import * as driverContextService from '../services/driverContextService';
import { authServiceClient } from '../services/authServiceClient';
import { config } from '../config';
import { TripData } from '../services/dispatchService';
import { cacheSet, driverLocationKey, driverLiveLocationKey } from '../cache/redis';
import { distanceMeters, type LatLng } from '../utils/geo';
import { notifyDriver, notifyCustomer } from '../services/notify';
import { maybeNotifyCustomerOfProximity, maybeNotifyCustomerOfDropoffProximity } from '../services/proximityService';
import { pushDriverScheduleUpdated, reachDriver } from '../services/driverReachService';
import * as driverSettingsService from '../services/driverSettingsService';
import { getLogger } from '../services/logger';

const router = Router();
const log = getLogger('trips');

// Precise coordinates the client already resolved (Goong Place Detail after
// an autocomplete pick, or the customer's own GPS fix) — when present,
// mapsService.getRoute uses these directly instead of re-geocoding the
// address text, which is both more accurate and skips a network round-trip.
// Callers that only ever send address text (voice-agent, admin) get
// `undefined` here and fall back to the original geocode-by-text behavior.
function coordsFromBody(body: Record<string, unknown>, latKey: string, lngKey: string): LatLng | undefined {
  const lat = body[latKey];
  const lng = body[lngKey];
  return typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : undefined;
}

const ALLOWED_STATUSES = new Set([
  'pending', 'notified', 'calling', 'confirmed', 'rejected', 'no_answer', 'completed',
  'cancelled', 'cancelled_by_driver', 'no_show', 'arrived_pickup', 'picked_up',
]);

// Once a trip lands in one of these, it's done — no more status changes.
// The customer/driver must book a new trip instead. `rejected`/`no_answer`
// are deliberately NOT here even though they sound terminal — POST
// /:tripId/dispatch explicitly retries from either (redispatches to another
// driver), so a rejected/unanswered trip is still "alive" from the
// customer's point of view, just waiting on a different driver.
const CANCELLED_STATUSES = new Set(['cancelled', 'cancelled_by_driver']);

// Who may cancel, and from which states — enforced here (not just by which
// button the FE happens to show). Both sides get the exact same cutoff:
// cancellation is only ever allowed *before* the customer is actually in the
// vehicle (`picked_up`) — once the ride is physically underway, neither side
// can back out via cancel anymore (see POST /:tripId/issues for reporting a
// problem mid-ride instead).
//   - Customer can cancel (`cancelled`) any time from booking up through
//     arrived_pickup — pending/notified/calling/confirmed/arrived_pickup,
//     plus rejected/no_answer (this specific driver didn't take it, but the
//     trip itself is still pending redispatch, not resolved — the customer
//     shouldn't have to wait out a retry they no longer want).
//   - Driver can cancel (`cancelled_by_driver`) from confirmed/
//     arrived_pickup — i.e. after accepting but before pickup. They can't
//     "cancel" a trip they haven't accepted yet; that's `reject`.
const CANCEL_RULES: Partial<Record<string, { role: 'customer' | 'driver'; fromStatuses: Set<string> }>> = {
  cancelled: {
    role: 'customer',
    fromStatuses: new Set(['pending', 'notified', 'calling', 'confirmed', 'arrived_pickup', 'rejected', 'no_answer']),
  },
  cancelled_by_driver: { role: 'driver', fromStatuses: new Set(['confirmed', 'arrived_pickup']) },
};

// arrived_pickup/picked_up require the driver to actually be near the pickup
// point; completed requires them to be near the dropoff point — both checked
// against config.arrivalRadiusMeters. Admin (service callers) bypass this,
// same as isTripOwner, since they're not the ones physically holding the GPS.
const ARRIVAL_LOCATION_TARGET: Partial<Record<string, 'pickup' | 'dropoff'>> = {
  arrived_pickup: 'pickup',
  picked_up: 'pickup',
  completed: 'dropoff',
};

// Local seed/booking may omit driver_phone only when DEFAULT_DRIVER_PHONE is set.
// Production clients must always send driver_phone; never bake a number into code.
// Real dispatch / nearest-driver matching is still TODO.

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
    const bookedVia = String(body.booked_via || 'app').trim() || 'app';
    // Walk-up / street-hail: driver (or voice on their behalf) creates an
    // already-accepted trip — no offer banner, no new_trip_offer nudge.
    const isWalkUp = bookedVia === 'driver';

    let driverPhone = String(body.driver_phone || config.phoneDriver || '').trim();
    if (isWalkUp && req.user?.role === 'driver' && req.user.phone) {
      // Bind to the authenticated driver — ignore spoofed body.driver_phone.
      driverPhone = String(req.user.phone).trim();
    }
    if (!driverPhone) {
      return res.status(400).json({
        detail: 'driver_phone is required (set body.driver_phone or DEFAULT_DRIVER_PHONE for local)',
      });
    }

    const customerPhone = String(body.customer_phone || '').trim();
    const pickupAddress = String(body.pickup_address || '').trim();
    const dropoffAddress = String(body.dropoff_address || '').trim();

    if (isWalkUp) {
      if (!customerPhone || customerPhone.length < 8) {
        return res.status(400).json({ detail: 'customer_phone is required for driver walk-up trips' });
      }
      if (!pickupAddress || pickupAddress.length < 3) {
        return res.status(400).json({ detail: 'pickup_address is required for driver walk-up trips' });
      }
      if (!dropoffAddress || dropoffAddress.length < 3) {
        return res.status(400).json({ detail: 'dropoff_address is required for driver walk-up trips' });
      }
    }

    if (customerPhone && normalizePhone(customerPhone) === normalizePhone(driverPhone)) {
      // Live 2026-09-05: self-call SIP loop when trip used the driver's own number as customer.
      return res.status(400).json({
        detail: 'customer_phone must differ from driver_phone',
      });
    }
    const route = await mapsService.getRoute(
      pickupAddress || body.pickup_address,
      dropoffAddress || body.dropoff_address,
      coordsFromBody(body, 'pickup_lat', 'pickup_lng'),
      coordsFromBody(body, 'dropoff_lat', 'dropoff_lng'),
    );
    const idAccount = await resolveCustomerAccountId(req, body.customer_phone);
    const trip = await tripService.create({
      ...body,
      booked_via: bookedVia,
      customer_phone: customerPhone || body.customer_phone,
      pickup_address: pickupAddress || body.pickup_address,
      dropoff_address: dropoffAddress || body.dropoff_address,
      driver_phone: driverPhone,
      ...(isWalkUp ? { status: 'confirmed' } : {}),
      has_bulky_goods: body.has_bulky_goods === true,
      with_children: body.with_children === true,
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

    if (isWalkUp) {
      await driverContextService.invalidateTripParties(trip);
      if (trip.driver_phone) {
        // Refresh dashboard / open voice session — do NOT emit trip_offer.
        await pushDriverScheduleUpdated(trip.driver_phone);
      }
      return res.status(201).json(trip);
    }

    // Mark it 'notified' right away so it shows up on the assigned driver's dashboard.
    const notified = await tripService.updateStatus(trip.trip_id, 'notified');
    await driverContextService.invalidateTripParties(notified ?? trip);
    // Real-time nudge to the driver the customer picked — driver-app's
    // useDispatchSocket invalidates its driverContext query on 'trip_offer'.
    // notify() itself is a safe no-op if the driver has no live connection.
    const finalTrip = notified ?? trip;
    if (finalTrip.driver_phone) {
      await notifyDriver(finalTrip.driver_phone, 'trip_offer', { trip_id: finalTrip.trip_id });
      // App WS is the banner. This LiveKit nudge reloads the in-call
      // context_store snapshot and speaks the offer — without it a session
      // that prefetched 3 trips would keep answering "3" after a 4th booked.
      reachDriver(finalTrip.driver_phone, 'new_trip_offer', {
        related_trip_id: finalTrip.trip_id,
        customer_name: finalTrip.customer_name ?? '',
        pickup_address: finalTrip.pickup_address ?? '',
      }).catch((err) => {
        log.warning('new-trip voice nudge failed', {
          trip: finalTrip.trip_id.slice(0, 8),
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }
    return res.status(201).json(finalTrip);
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
    const arrivalTarget = ARRIVAL_LOCATION_TARGET[status];
    if (arrivalTarget && req.user?.role !== 'admin') {
      const targetLat = arrivalTarget === 'pickup' ? trip.pickup_lat : trip.dropoff_lat;
      const targetLng = arrivalTarget === 'pickup' ? trip.pickup_lng : trip.dropoff_lng;
      // Older/text-only-address trips have no stored coords to check against
      // — nothing to validate, so let those through same as before this rule.
      if (typeof targetLat === 'number' && typeof targetLng === 'number') {
        const driverLat = Number(req.body.lat);
        const driverLng = Number(req.body.lng);
        if (!Number.isFinite(driverLat) || !Number.isFinite(driverLng)) {
          return res.status(400).json({
            detail: 'Cần vị trí hiện tại (lat/lng) của tài xế để xác nhận trạng thái này',
          });
        }
        const distance = distanceMeters({ lat: driverLat, lng: driverLng }, { lat: targetLat, lng: targetLng });
        if (distance > config.arrivalRadiusMeters) {
          return res.status(409).json({
            detail: arrivalTarget === 'pickup'
              ? 'Bạn chưa đến điểm đón khách. Vui lòng di chuyển đến gần điểm đón để xác nhận.'
              : 'Bạn chưa đến điểm trả khách. Vui lòng di chuyển đến gần điểm trả khách để hoàn thành chuyến.',
            distance_meters: Math.round(distance),
            required_radius_meters: config.arrivalRadiusMeters,
          });
        }
      }
    }
    const updated = await tripService.updateStatus(req.params.tripId, status);
    await driverContextService.invalidateTripParties(updated);
    // Push every status change so the apps refetch from the socket instead
    // of a GET interval. notify() is a no-op if nobody is connected.
    // trip_confirmed / trip_rejected keep their own names because the
    // customer banner keys off those two; everything else is trip_updated.
    if (updated) {
      const customerId = updated.id_account || updated.customer_phone;
      if (customerId) {
        if (status === 'confirmed' || status === 'rejected') {
          await notifyCustomer(customerId, status === 'confirmed' ? 'trip_confirmed' : 'trip_rejected', { trip_id: updated.trip_id });
        } else {
          await notifyCustomer(customerId, 'trip_updated', { trip_id: updated.trip_id, status });
        }
      }
    }
    // Same event name/shape as the customer-facing one above but to the
    // DRIVER's own socket — this is what driver-app's useDispatchSocket.ts
    // listens for to immediately push a fresh GPS fix (POST
    // /drivers/me/location/live) right as a trip lands in the routing-active
    // set, rather than waiting on useLiveDriverLocation's own ~10min cadence.
    // Fires for both the driver-app "Accept" button and voice-agent's
    // confirm_trip tool, since both PATCH through this exact handler.
    if (updated && status === 'confirmed' && updated.driver_phone) {
      await notifyDriver(updated.driver_phone, 'trip_confirmed', { trip_id: updated.trip_id });
    }
    // arrived_pickup/picked_up/completed all already carry a fresh,
    // just-validated GPS fix (see the arrival-radius check above) — cache it
    // as this driver's live location right now (skips waiting on the next
    // ~10min useLiveDriverLocation tick). invalidateTripParties above
    // already cleared the cached route, and completing/progressing a stop
    // always changes which points are still in it: dropped entirely once
    // `completed`, pickup -> dropoff once `picked_up` — see
    // routeOptimizationService.ts's candidatesFromTrips, which reads each
    // trip's CURRENT status to decide what it still contributes, so a
    // completed/progressed trip is excluded on the very next rebuild
    // without any separate "visited" list to maintain — status IS that list.
    if (updated?.driver_phone && (status === 'arrived_pickup' || status === 'picked_up' || status === 'completed')) {
      const driverLat = Number(req.body.lat);
      const driverLng = Number(req.body.lng);
      if (Number.isFinite(driverLat) && Number.isFinite(driverLng)) {
        await cacheSet(driverLiveLocationKey(updated.driver_phone), { lat: driverLat, lng: driverLng, updated_at: new Date().toISOString() }, 1200);
      }
    }
    // Any PATCH that has a driver (cancel, reject, no_show, progress, …)
    // changes their dashboard — push so the app refetches immediately.
    if (updated?.driver_phone) {
      await pushDriverScheduleUpdated(updated.driver_phone);
    }
    // Proactive "what should I do next" nudge — fires right when the driver
    // just picked up (status=picked_up) or just dropped off (status=
    // completed) a customer, whether that PATCH came from the driver-app UI
    // button or the voice-agent's update_trip_status tool, since both go
    // through this exact same handler. Deliberately excludes arrived_pickup
    // — that's "reached pickup, customer not in the car yet", not actually
    // "done with this stop" yet. Fire-and-forget: must never delay or fail
    // this response over a nudge. Empty payload on purpose — nudge.py's
    // suggest_next_stop live-refetches the driver's schedule itself rather
    // than trusting whatever this request's body had.
    if (config.enableNextStopNudge && updated?.driver_phone
        && (status === 'picked_up' || status === 'completed')) {
      const driverPhone = updated.driver_phone;
      driverSettingsService.getByPhone(driverPhone).then(settings => {
        if (!settings?.auto_suggest_next_stop) return undefined;
        return reachDriver(driverPhone, 'suggest_next_stop', {});
      }).catch(err => {
        log.warning('next-stop nudge failed', {
          trip: updated.trip_id.slice(0, 8),
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }
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

    await maybeNotifyCustomerOfProximity(trip, { lat, lng });
    await maybeNotifyCustomerOfDropoffProximity(trip, { lat, lng });

    return res.json({ status: 'ok' });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.post('/:tripId/confirm-with-customer', async (req: Request, res: Response) => {
  try {
    const trip = await tripService.get(req.params.tripId);
    if (!trip) return res.status(404).json({ detail: 'Trip not found' });
    const message = req.body.message || 'Tài xế đã xác nhận chuyến đi và sẽ đến đón đúng giờ.';
    log.info('sms stub sent', { trip: trip.trip_id.slice(0, 8) });
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

// Customer's "Đặt lại chuyến" button after a driver rejects — updates the
// SAME trip record (driver_phone + status back to 'notified'), not a new
// booking, so trip history/pricing/pickup stay attached to one record.
// Distinct from POST /:tripId/dispatch below: that one is a phone-call
// redispatch (sets status='calling'); this one re-offers through the app,
// same as the original POST / booking's notify.
router.post('/:tripId/reassign-driver', async (req: Request, res: Response) => {
  try {
    const trip = await tripService.get(req.params.tripId);
    if (!trip) return res.status(404).json({ detail: 'Trip not found' });
    if (!isTripOwner(req, trip)) {
      return res.status(403).json({ detail: 'Not authorized to modify this trip' });
    }
    if (req.user?.role === 'driver') {
      return res.status(403).json({ detail: 'Only the customer can reassign a driver' });
    }
    if (trip.status !== 'rejected') {
      return res.status(409).json({ detail: `Cannot reassign driver for trip with status=${trip.status}` });
    }
    const driverPhone = typeof req.body.driver_phone === 'string' ? req.body.driver_phone.trim() : '';
    if (!driverPhone) return res.status(400).json({ detail: 'driver_phone is required' });

    const updated = await tripService.updateStatus(req.params.tripId, 'notified', { driver_phone: driverPhone });
    await driverContextService.invalidateTripParties(updated ?? trip);
    if (updated) {
      await notifyDriver(driverPhone, 'trip_offer', { trip_id: updated.trip_id });
      reachDriver(driverPhone, 'new_trip_offer', {
        related_trip_id: updated.trip_id,
        customer_name: updated.customer_name ?? '',
        pickup_address: updated.pickup_address ?? '',
      }).catch((err) => {
        log.warning('new-trip voice nudge failed', {
          trip: updated.trip_id.slice(0, 8),
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }
    return res.json(updated);
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
    if (updated?.driver_phone) {
      await pushDriverScheduleUpdated(updated.driver_phone);
    }
    const customerId = updated?.id_account || updated?.customer_phone || trip.id_account || trip.customer_phone;
    if (customerId) {
      await notifyCustomer(customerId, 'trip_updated', { trip_id: trip.trip_id, status: 'calling' });
    }
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
