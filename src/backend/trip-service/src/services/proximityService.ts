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

// Fires the "driver is close to pickup" call at most once per trip — the
// dedupe flag is what makes this safe to call on every single GPS ping
// without spamming the customer.
export async function maybeNotifyCustomerOfProximity(
  trip: tripService.Trip,
  driverCoords: LatLng,
): Promise<void> {
  if (typeof trip.pickup_lat !== 'number' || typeof trip.pickup_lng !== 'number') return;
  if (!trip.driver_phone || !trip.customer_phone) return;

  // Driver-level opt-in: off by default (see auth-service's driver-settings
  // table) — a driver who never turned this on gets no proximity call at all,
  // regardless of config.proximityAlertMeters.
  const settings = await driverSettingsService.getByPhone(trip.driver_phone);
  if (!settings?.notify_on_pickup_approach) return;

  const distance = distanceMeters(driverCoords, { lat: trip.pickup_lat, lng: trip.pickup_lng });
  if (distance > (settings.notify_on_pickup_approach_radius_m || config.proximityAlertMeters)) return;

  const notifiedKey = tripProximityNotifiedKey(trip.trip_id);
  if (await cacheGet(notifiedKey)) return;
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
        customMessage: 'Tài xế sắp đến điểm đón, vui lòng ra cổng hoặc đường lớn để tài xế dễ đón bạn nhé.',
      });
    } catch (err) {
      console.warn(`[proximity] pickup call failed for trip=${trip.trip_id}:`, err);
    }
    return;
  }

  try {
    await reachDriver(trip.driver_phone, 'proximity_pickup', {
      related_trip_id: trip.trip_id,
      customer_name: trip.customer_name,
      pickup_address: trip.pickup_address,
    });
  } catch (err) {
    console.warn(`[proximity] pickup nudge failed for trip=${trip.trip_id}:`, err);
  }
}

// Mirrors maybeNotifyCustomerOfProximity above but for the DROPOFF point —
// only fires once the customer is actually in the car (status=picked_up),
// separate dedupe key so it doesn't collide with the pickup-side notify
// (both can legitimately fire once each within the same trip).
export async function maybeNotifyCustomerOfDropoffProximity(
  trip: tripService.Trip,
  driverCoords: LatLng,
): Promise<void> {
  if (trip.status !== 'picked_up') return;
  if (typeof trip.dropoff_lat !== 'number' || typeof trip.dropoff_lng !== 'number') return;
  if (!trip.driver_phone || !trip.customer_phone) return;

  // Same driver-level toggle as the pickup side above — one setting covers
  // both ends of the trip, there's no separate dropoff-only column.
  const settings = await driverSettingsService.getByPhone(trip.driver_phone);
  if (!settings?.notify_on_pickup_approach) return;

  const distance = distanceMeters(driverCoords, { lat: trip.dropoff_lat, lng: trip.dropoff_lng });
  if (distance > (settings.notify_on_pickup_approach_radius_m || config.proximityAlertMeters)) return;

  const notifiedKey = tripDropoffProximityNotifiedKey(trip.trip_id);
  if (await cacheGet(notifiedKey)) return;
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
      console.warn(`[proximity] dropoff call failed for trip=${trip.trip_id}:`, err);
    }
    return;
  }

  try {
    await reachDriver(trip.driver_phone, 'proximity_dropoff', {
      related_trip_id: trip.trip_id,
      customer_name: trip.customer_name,
      dropoff_address: trip.dropoff_address,
    });
  } catch (err) {
    console.warn(`[proximity] dropoff nudge failed for trip=${trip.trip_id}:`, err);
  }
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
): Promise<void> {
  if (!config.enableNextStopNudge) return;
  if (typeof trip.pickup_lat !== 'number' || typeof trip.pickup_lng !== 'number') return;
  if (!trip.driver_phone) return;

  // Driver-level opt-in: off by default — no auto-suggestion nudge unless
  // the driver has explicitly turned this on.
  const settings = await driverSettingsService.getByPhone(trip.driver_phone);
  if (!settings?.auto_suggest_next_stop) return;

  const distance = distanceMeters(driverCoords, { lat: trip.pickup_lat, lng: trip.pickup_lng });
  if (distance > (settings.auto_suggest_next_stop_radius_m || config.nextStopAnnounceMeters)) return;

  const announcedKey = tripArrivalAnnouncedKey(trip.trip_id);
  if (await cacheGet(announcedKey)) return;
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
    console.warn(`[proximity] pickup arrival next-stop nudge failed for trip=${trip.trip_id}:`, err);
  }
}

// Mirrors maybeAnnouncePickupArrivalNextStop above but for the DROPOFF point.
export async function maybeAnnounceDropoffArrivalNextStop(
  trip: tripService.Trip,
  driverCoords: LatLng,
): Promise<void> {
  if (!config.enableNextStopNudge) return;
  if (trip.status !== 'picked_up') return;
  if (typeof trip.dropoff_lat !== 'number' || typeof trip.dropoff_lng !== 'number') return;
  if (!trip.driver_phone) return;

  const settings = await driverSettingsService.getByPhone(trip.driver_phone);
  if (!settings?.auto_suggest_next_stop) return;

  const distance = distanceMeters(driverCoords, { lat: trip.dropoff_lat, lng: trip.dropoff_lng });
  if (distance > (settings.auto_suggest_next_stop_radius_m || config.nextStopAnnounceMeters)) return;

  const announcedKey = tripDropoffArrivalAnnouncedKey(trip.trip_id);
  if (await cacheGet(announcedKey)) return;
  await cacheSet(announcedKey, true, 3600);

  try {
    await reachDriver(trip.driver_phone, 'suggest_next_stop', { related_trip_id: trip.trip_id });
  } catch (err) {
    console.warn(`[proximity] dropoff arrival next-stop nudge failed for trip=${trip.trip_id}:`, err);
  }
}
