// Auto-calls the customer when the driver's GPS gets close to pickup/dropoff.
// Pulled out of routes/trips.ts so routes/drivers.ts (new POST /me/location,
// not tied to a single tripId) can reuse the exact same logic.
import { config } from '../config';
import * as tripService from '../services/tripService';
import * as callService from '../services/callService';
import * as driverSettingsService from './driverSettingsService';
import { reachDriver } from './driverReachService';
import {
  cacheSet,
  cacheGet,
  tripProximityNotifiedKey,
  tripDropoffProximityNotifiedKey,
  tripArrivalAnnouncedKey,
  tripDropoffArrivalAnnouncedKey,
} from '../cache/redis';
import { distanceMeters, type LatLng } from '../utils/geo';
import { getLogger } from './logger';

const log = getLogger('proximity');

function tripShort(trip: tripService.Trip): string {
  return trip.trip_id.slice(0, 8);
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// All four functions below return whether they actually fired a nudge this
// call (vs. skipped for any reason: out of range, already deduped, feature
// off) — callers (runProximityChecks in drivers.ts) use this to stop after
// the first one that fires per check cycle. driverReachService.ts's pending-
// nudge storage is a SINGLE overwritable slot, not a queue: if two of these
// fire back to back (e.g. two different trips both within the 1km radius,
// or a trip close enough to trigger both the 1km notify AND the 200m
// suggest in the same pass), the second call's reachDriver() silently
// clobbers the first one's pending nudge before it's ever delivered — a real
// driver saw exactly this: the farther of two in-range pickups (766m) ended
// up as the delivered nudge instead of the nearer one (314m) that fired
// first, because it fired second and overwrote it moments later.

// Fires the "driver is close to pickup" call at most once per trip — the
// dedupe flag is what makes this safe to call on every single GPS ping
// without spamming the customer.
/** "Tài xế còn khoảng 900 m nữa là tới Đền Quán Thánh, anh chị ra điểm đón giúp tài xế nhé."
 *  Spoken by the customer-call agent as its opening — real distance and the
 *  short pickup name instead of a fixed "sắp đến" line. */
export function pickupApproachMessage(distanceM: number, pickupAddress?: string): string {
  // Round first, then pick the unit, so 996 m reads "1 km", not "1000 m".
  const rounded = distanceM < 950 ? Math.max(100, Math.round(distanceM / 100) * 100) : Math.round(distanceM / 500) * 500;
  const d = rounded < 1000 ? `${rounded} m` : `${(rounded / 1000).toString().replace('.', ',')} km`;
  const place = (pickupAddress ?? '').split(',')[0].trim();
  const where = place ? ` là tới ${place}` : ' là tới điểm đón';
  return `Tài xế còn khoảng ${d} nữa${where}, anh chị ra điểm đón giúp tài xế nhé.`;
}

export async function maybeNotifyCustomerOfProximity(
  trip: tripService.Trip,
  driverCoords: LatLng,
): Promise<boolean> {
  if (typeof trip.pickup_lat !== 'number' || typeof trip.pickup_lng !== 'number') return false;
  if (!trip.driver_phone || !trip.customer_phone) return false;

  // Driver-level opt-in: off by default (see auth-service's driver-settings
  // table) — a driver who never turned this on gets no proximity call at all,
  // regardless of config.proximityAlertMeters.
  const settings = await driverSettingsService.getByPhone(trip.driver_phone);
  if (!settings?.notify_on_pickup_approach) return false;

  const radius = settings.notify_on_pickup_approach_radius_m || config.proximityAlertMeters;
  const distance = distanceMeters(driverCoords, { lat: trip.pickup_lat, lng: trip.pickup_lng });
  if (distance > radius) {
    log.info('pickup-notify skip (out of range)', {
      trip: tripShort(trip),
      distance_m: Math.round(distance),
      radius_m: radius,
    });
    return false;
  }

  const notifiedKey = tripProximityNotifiedKey(trip.trip_id);
  if (await cacheGet(notifiedKey)) {
    log.info('pickup-notify skip (already notified)', {
      trip: tripShort(trip),
      distance_m: Math.round(distance),
    });
    return false;
  }
  log.info('pickup-notify FIRING', {
    trip: tripShort(trip),
    distance_m: Math.round(distance),
    radius_m: radius,
  });
  // Set the flag before acting (not after) so two near-simultaneous pings
  // can't both pass the cacheGet check above and double-dial/double-ask.
  await cacheSet(notifiedKey, true, 3600);

  // ENABLE_PROXIMITY_ASK off (default): unchanged behavior — call the
  // customer directly. On: ask the driver first via reachDriver, and only
  // call_customer(mode="agent") if they agree (handled voice-agent side).
  if (!config.enableProximityAsk) {
    try {
      await callService.startCustomerCall({
        driverPhone: trip.driver_phone,
        customerPhone: trip.customer_phone,
        tripId: trip.trip_id,
        mode: 'background',
        customerName: trip.customer_name,
        pickupAddress: trip.pickup_address,
        customMessage: pickupApproachMessage(distance, trip.pickup_address),
      });
    } catch (err) {
      log.warning('pickup call failed', { trip: tripShort(trip), error: errMsg(err) });
    }
    return true;
  }

  try {
    await reachDriver(trip.driver_phone, 'proximity_pickup', {
      related_trip_id: trip.trip_id,
      customer_name: trip.customer_name,
      pickup_address: trip.pickup_address,
    });
  } catch (err) {
    log.warning('pickup nudge failed', { trip: tripShort(trip), error: errMsg(err) });
  }
  return true;
}

// Mirrors maybeNotifyCustomerOfProximity above but for the DROPOFF point —
// only fires once the customer is actually in the car (status=picked_up),
// separate dedupe key so it doesn't collide with the pickup-side notify
// (both can legitimately fire once each within the same trip).
export async function maybeNotifyCustomerOfDropoffProximity(
  trip: tripService.Trip,
  driverCoords: LatLng,
): Promise<boolean> {
  if (trip.status !== 'picked_up') return false;
  if (typeof trip.dropoff_lat !== 'number' || typeof trip.dropoff_lng !== 'number') return false;
  if (!trip.driver_phone || !trip.customer_phone) return false;

  // Same driver-level toggle as the pickup side above — one setting covers
  // both ends of the trip, there's no separate dropoff-only column.
  const settings = await driverSettingsService.getByPhone(trip.driver_phone);
  if (!settings?.notify_on_pickup_approach) return false;

  const radius = settings.notify_on_pickup_approach_radius_m || config.proximityAlertMeters;
  const distance = distanceMeters(driverCoords, { lat: trip.dropoff_lat, lng: trip.dropoff_lng });
  if (distance > radius) {
    log.info('dropoff-notify skip (out of range)', {
      trip: tripShort(trip),
      distance_m: Math.round(distance),
      radius_m: radius,
    });
    return false;
  }

  const notifiedKey = tripDropoffProximityNotifiedKey(trip.trip_id);
  if (await cacheGet(notifiedKey)) {
    log.info('dropoff-notify skip (already notified)', {
      trip: tripShort(trip),
      distance_m: Math.round(distance),
    });
    return false;
  }
  log.info('dropoff-notify FIRING', {
    trip: tripShort(trip),
    distance_m: Math.round(distance),
    radius_m: radius,
  });
  await cacheSet(notifiedKey, true, 3600);

  if (!config.enableProximityAsk) {
    try {
      await callService.startCustomerCall({
        driverPhone: trip.driver_phone,
        customerPhone: trip.customer_phone,
        tripId: trip.trip_id,
        mode: 'background',
        customerName: trip.customer_name,
        customMessage: 'Vui lòng kiểm tra hành lý trên xe, bạn sắp đến nơi rồi.',
      });
    } catch (err) {
      log.warning('dropoff call failed', { trip: tripShort(trip), error: errMsg(err) });
    }
    return true;
  }

  try {
    await reachDriver(trip.driver_phone, 'proximity_dropoff', {
      related_trip_id: trip.trip_id,
      customer_name: trip.customer_name,
      dropoff_address: trip.dropoff_address,
    });
  } catch (err) {
    log.warning('dropoff nudge failed', { trip: tripShort(trip), error: errMsg(err) });
  }
  return true;
}

// Closer checkpoint (~200m, config.nextStopAnnounceMeters) than the 1km
// call-offer above — by now the driver is genuinely arriving at this trip's
// pickup, so it's the right moment to have the AI look across ALL of the
// driver's pending stops and announce the route-optimal one to head to next
// (see voice-agent's next_stop.py — reuses the exact same 'suggest_next_stop'
// nudge_kind/content as the post-status-change nudge in routes/trips.ts,
// just triggered by GPS proximity instead of a status transition). Separate
// dedupe key from tripProximityNotifiedKey so this and the 1km call-offer
// can each fire once independently for the same trip.
export async function maybeAnnouncePickupArrivalNextStop(
  trip: tripService.Trip,
  driverCoords: LatLng,
): Promise<boolean> {
  if (!config.enableNextStopNudge) return false;
  if (typeof trip.pickup_lat !== 'number' || typeof trip.pickup_lng !== 'number') return false;
  if (!trip.driver_phone) return false;

  // Driver-level opt-in: off by default — no auto-suggestion nudge unless
  // the driver has explicitly turned this on.
  const settings = await driverSettingsService.getByPhone(trip.driver_phone);
  if (!settings?.auto_suggest_next_stop) return false;

  const radius = settings.auto_suggest_next_stop_radius_m || config.nextStopAnnounceMeters;
  const distance = distanceMeters(driverCoords, { lat: trip.pickup_lat, lng: trip.pickup_lng });
  if (distance > radius) {
    log.info('pickup-suggest skip (out of range)', {
      trip: tripShort(trip),
      distance_m: Math.round(distance),
      radius_m: radius,
    });
    return false;
  }

  const announcedKey = tripArrivalAnnouncedKey(trip.trip_id);
  if (await cacheGet(announcedKey)) {
    log.info('pickup-suggest skip (already announced)', {
      trip: tripShort(trip),
      distance_m: Math.round(distance),
    });
    return false;
  }
  log.info('pickup-suggest FIRING', {
    trip: tripShort(trip),
    distance_m: Math.round(distance),
    radius_m: radius,
  });
  await cacheSet(announcedKey, true, 3600);

  try {
    // related_trip_id (unlike the empty payload in routes/trips.ts's
    // post-status-change trigger) tells nudge.py's suggest_next_stop branch
    // to EXCLUDE this trip when ranking — it's still sitting at
    // confirmed/arrived_pickup (not yet marked arrived), so without
    // excluding it it would trivially win its own "nearest stop" ranking
    // (the driver is standing right on it) and announce "go to A" to a
    // driver already at A. The rest of the schedule is still live-refetched
    // by nudge.py itself, not trusted from this payload.
    await reachDriver(trip.driver_phone, 'suggest_next_stop', { related_trip_id: trip.trip_id });
  } catch (err) {
    log.warning('pickup arrival next-stop nudge failed', { trip: tripShort(trip), error: errMsg(err) });
  }
  return true;
}

// Mirrors maybeAnnouncePickupArrivalNextStop above but for the DROPOFF point.
export async function maybeAnnounceDropoffArrivalNextStop(
  trip: tripService.Trip,
  driverCoords: LatLng,
): Promise<boolean> {
  if (!config.enableNextStopNudge) return false;
  if (trip.status !== 'picked_up') return false;
  if (typeof trip.dropoff_lat !== 'number' || typeof trip.dropoff_lng !== 'number') return false;
  if (!trip.driver_phone) return false;

  const settings = await driverSettingsService.getByPhone(trip.driver_phone);
  if (!settings?.auto_suggest_next_stop) return false;

  const radius = settings.auto_suggest_next_stop_radius_m || config.nextStopAnnounceMeters;
  const distance = distanceMeters(driverCoords, { lat: trip.dropoff_lat, lng: trip.dropoff_lng });
  if (distance > radius) {
    log.info('dropoff-suggest skip (out of range)', {
      trip: tripShort(trip),
      distance_m: Math.round(distance),
      radius_m: radius,
    });
    return false;
  }

  const announcedKey = tripDropoffArrivalAnnouncedKey(trip.trip_id);
  if (await cacheGet(announcedKey)) {
    log.info('dropoff-suggest skip (already announced)', {
      trip: tripShort(trip),
      distance_m: Math.round(distance),
    });
    return false;
  }
  log.info('dropoff-suggest FIRING', {
    trip: tripShort(trip),
    distance_m: Math.round(distance),
    radius_m: radius,
  });
  await cacheSet(announcedKey, true, 3600);

  try {
    await reachDriver(trip.driver_phone, 'suggest_next_stop', { related_trip_id: trip.trip_id });
  } catch (err) {
    log.warning('dropoff arrival next-stop nudge failed', { trip: tripShort(trip), error: errMsg(err) });
  }
  return true;
}
