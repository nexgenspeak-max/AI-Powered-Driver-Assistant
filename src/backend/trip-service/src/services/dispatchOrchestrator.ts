import { config } from '../config';
import * as tripService from './tripService';
import * as driverContextService from './driverContextService';
import { matchDrivers } from './matchDriverService';
import { notifyDriver, notifyCustomer } from './notify';
import { scheduleOfferTimeout } from './dispatchTimer';

// Which candidates have already been offered this trip, so a timeout-driven
// retry doesn't re-offer the same person. In-memory — fine for `local.ts`
// (one long-lived process); the Lambda path will need this moved somewhere
// durable (e.g. a Trip field) once the SQS/WebSocket infra lands, since a
// fresh Lambda invocation won't share this Map. Tracked as a known gap.
const triedCandidates = new Map<string, Set<string>>();

function getTried(tripId: string): Set<string> {
  if (!triedCandidates.has(tripId)) triedCandidates.set(tripId, new Set());
  return triedCandidates.get(tripId)!;
}

// Entry point for POST /trips/auto-match — offers the trip to the best
// candidate and arms the 15s timeout. Distinct from POST /trips (unchanged,
// single driver_phone flow) — this is the only place that calls
// matchDriverService.
export async function startAutoMatch(trip: tripService.Trip): Promise<tripService.Trip> {
  if (typeof trip.pickup_lat !== 'number' || typeof trip.pickup_lng !== 'number') {
    throw new Error('Trip has no pickup coordinates — cannot auto-match');
  }
  return offerNextCandidate(trip, { lat: trip.pickup_lat, lng: trip.pickup_lng });
}

async function offerNextCandidate(
  trip: tripService.Trip,
  pickup: { lat: number; lng: number },
): Promise<tripService.Trip> {
  const tried = getTried(trip.trip_id);
  const candidates = await matchDrivers(pickup, tried);

  if (candidates.length === 0) {
    triedCandidates.delete(trip.trip_id);
    const updated = await tripService.updateStatus(trip.trip_id, 'no_driver_found', { driver_phone: '' });
    await notifyCustomer(trip.id_account || trip.customer_phone, 'no_driver_found', { trip_id: trip.trip_id });
    return updated ?? trip;
  }

  const candidate = candidates[0];
  tried.add(candidate.driver_phone);

  const updated = await tripService.updateStatus(trip.trip_id, 'notified', { driver_phone: candidate.driver_phone });
  await driverContextService.invalidateTripParties(updated ?? trip);
  await notifyDriver(candidate.driver_phone, 'trip_offer', { trip_id: trip.trip_id });
  await scheduleOfferTimeout(trip.trip_id, candidate.driver_phone, config.dispatchOfferTimeoutSeconds);

  return updated ?? trip;
}

// Fired by dispatchTimer after the offer window elapses. Re-checks trip
// state before acting — if the driver already accepted/rejected, or a later
// offer already superseded this one, this timeout is stale and must be a
// no-op rather than clobbering newer state.
export async function handleOfferTimeout(tripId: string, candidatePhone: string): Promise<void> {
  const trip = await tripService.get(tripId);
  if (!trip) return;
  if (trip.status !== 'notified' || trip.driver_phone !== candidatePhone) return;
  if (typeof trip.pickup_lat !== 'number' || typeof trip.pickup_lng !== 'number') return;

  await offerNextCandidate(trip, { lat: trip.pickup_lat, lng: trip.pickup_lng });
}

// Called from PATCH /:tripId once a driver accepts an auto-matched trip —
// clears bookkeeping now that dispatch is resolved. Any already-scheduled
// setTimeout for this trip is left to fire harmlessly later: the status
// check in handleOfferTimeout above no-ops once status is `confirmed`.
export function cancelPendingOffer(tripId: string): void {
  triedCandidates.delete(tripId);
}
