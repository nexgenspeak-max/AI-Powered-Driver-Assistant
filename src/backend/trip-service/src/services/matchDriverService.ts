import { config } from '../config';
import { geoSearchDrivers } from '../cache/redis';
import { bearing, bearingDiffDegrees, type LatLng } from '../utils/geo';
import * as tripService from './tripService';

const BUSY_STATUSES = new Set(['confirmed', 'picked_up']);

export type CandidateGroup = 'idle' | 'ridepool';

export interface DriverCandidate {
  driver_phone: string;
  group: CandidateGroup;
  distance_meters: number;
}

async function findActiveTrip(driverPhone: string): Promise<tripService.Trip | null> {
  const recent = await tripService.listByDriver(driverPhone, 5);
  return recent.find(t => BUSY_STATUSES.has(t.status)) ?? null;
}

// Ranked dispatch candidates for a new trip's pickup point: every idle
// (no active trip) driver within radius, nearest first, followed by every
// busy driver within radius whose current trip is heading roughly the same
// direction as the new pickup ("ghép tuyến" — same-direction ride-pool),
// also nearest first. Groups are never interleaved/scored together — idle
// candidates are always offered before ride-pool ones, per product decision.
//
// `excludePhones` lets dispatchOrchestrator re-run this after a candidate's
// 15s offer window expires without getting the same person back.
export async function matchDrivers(
  pickup: LatLng,
  excludePhones: Set<string> = new Set(),
): Promise<DriverCandidate[]> {
  const nearby = await geoSearchDrivers(pickup, config.dispatchRadiusMeters);

  const idle: DriverCandidate[] = [];
  const ridepool: DriverCandidate[] = [];

  for (const driver of nearby) {
    if (excludePhones.has(driver.member)) continue;

    const activeTrip = await findActiveTrip(driver.member);
    if (!activeTrip) {
      idle.push({ driver_phone: driver.member, group: 'idle', distance_meters: driver.distanceMeters });
      continue;
    }

    if (typeof activeTrip.dropoff_lat !== 'number' || typeof activeTrip.dropoff_lng !== 'number') {
      // Can't tell which direction they're headed — skip rather than guess.
      continue;
    }

    const driverPos: LatLng = { lat: driver.lat, lng: driver.lng };
    const headingToOwnDropoff = bearing(driverPos, { lat: activeTrip.dropoff_lat, lng: activeTrip.dropoff_lng });
    const headingToNewPickup = bearing(driverPos, pickup);
    const diff = bearingDiffDegrees(headingToOwnDropoff, headingToNewPickup);

    if (diff <= config.ridePoolBearingDegrees) {
      ridepool.push({ driver_phone: driver.member, group: 'ridepool', distance_meters: driver.distanceMeters });
    }
  }

  return [...idle, ...ridepool];
}
