import * as tripService from './tripService';
import { phoneVariants } from '../utils/phone';

const FARE_PER_KM = 12000;
const BASE_FARE = 15000;

// Same phone-variant union as tripsForDriver in driverContextService.ts —
// driver_phone isn't stored in one consistent format, so a range query for
// a single exact phone string can undercount. Queried per-variant (not a
// single BETWEEN scan) because the GSI's partition key is the exact
// driver_phone value; there's no OR-across-partition-keys in a single
// Query.
async function tripsForDriverInRange(driverPhone: string, fromIso: string, toIso: string): Promise<tripService.Trip[]> {
  const seen = new Set<string>();
  const trips: tripService.Trip[] = [];
  for (const variant of phoneVariants(driverPhone)) {
    for (const trip of await tripService.listByDriverInRange(variant, fromIso, toIso)) {
      if (trip.trip_id && !seen.has(trip.trip_id)) {
        seen.add(trip.trip_id);
        trips.push(trip);
      }
    }
  }
  return trips;
}

// A trip can be booked well before it's actually completed and paid out
// (dispatch delay, a scheduled pickup_time, or just a slow trip) — bucketing
// by created_at (the only range key the driver_phone GSI has) would then
// miss a trip completed *today* if it happened to be booked yesterday, e.g.
// showing "today's earnings: 0" right after a driver completes a ride. Pad
// the created_at fetch window generously, then bucket for real by
// updated_at — the timestamp that actually moved when the trip was marked
// completed, since nothing updates a trip's row afterwards.
const CREATED_AT_FETCH_PAD_DAYS = 30;

async function completedTripsInRange(driverPhone: string, fromIso: string, toIso: string): Promise<tripService.Trip[]> {
  const paddedFrom = new Date(new Date(fromIso).getTime() - CREATED_AT_FETCH_PAD_DAYS * 86400000).toISOString();
  const trips = await tripsForDriverInRange(driverPhone, paddedFrom, toIso);
  return trips.filter(t => t.status === 'completed' && t.updated_at >= fromIso && t.updated_at <= toIso);
}

export function tripFare(trip: tripService.Trip): number {
  const km = Number(trip.distance_km) || 0;
  return Math.round(BASE_FARE + km * FARE_PER_KM);
}

export function enrichTrip(trip: tripService.Trip) {
  return { ...trip, estimated_fare: tripFare(trip) };
}

export async function todayForDriver(driverPhone: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const completedToday = await completedTripsInRange(driverPhone, startOfDay.toISOString(), new Date().toISOString());
  const total = completedToday.reduce((sum, t) => sum + tripFare(t), 0);
  return {
    total_earnings: total,
    trip_count: completedToday.length,
    bonus_earnings: 0,
    hours_online: Math.min(12, completedToday.length * 0.75),
    currency: 'VND',
  };
}

export async function summaryForDriver(driverPhone: string, period: 'week' | 'month' = 'week') {
  const days = period === 'month' ? 30 : 7;
  const from = new Date(Date.now() - days * 86400000).toISOString();
  const to = new Date().toISOString();
  const completed = await completedTripsInRange(driverPhone, from, to);
  const total = completed.reduce((sum, t) => sum + tripFare(t), 0);
  return {
    period,
    total_earnings: total,
    trip_count: completed.length,
    currency: 'VND',
  };
}

export function buildProfile(driverPhone: string, trips: tripService.Trip[]) {
  const mine = trips.filter(t => t.driver_phone === driverPhone || !t.driver_phone);
  const completed = mine.filter(t => t.status === 'completed');
  const offered = mine.filter(t =>
    ['confirmed', 'rejected', 'completed', 'calling', 'notified'].includes(t.status),
  );
  const accepted = mine.filter(t =>
    ['confirmed', 'completed', 'calling', 'notified'].includes(t.status),
  );
  const acceptanceRate = offered.length
    ? Math.round((accepted.length / offered.length) * 100)
    : 100;

  return {
    phone: driverPhone,
    rating: 4.85,
    acceptance_rate: acceptanceRate,
    completion_rate: accepted.length
      ? Math.round((completed.length / accepted.length) * 100)
      : 100,
    total_trips: completed.length,
  };
}

export function activeBonuses() {
  return [
    {
      description: 'Vùng trung tâm — tăng giá 1.2x',
      amount: '20%',
      expires_at: '23:59 hôm nay',
    },
  ];
}
