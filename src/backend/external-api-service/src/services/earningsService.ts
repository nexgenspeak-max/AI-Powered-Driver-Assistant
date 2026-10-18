import * as tripService from './tripService';
import { phoneVariants } from '../utils/phone';
import { cacheGet, cacheSet, driverProfileStatsKey } from '../cache/redis';

const FARE_PER_KM = 12000;
const BASE_FARE = 15000;

// Bucketed by completion time (updated_at — nothing updates a trip's row
// after it is completed), across every phone-format variant of the driver.
// tripService.listCompletedByDriverInRange explains why this is no longer a
// padded created_at window.
async function completedTripsInRange(driverPhone: string, fromIso: string, toIso: string): Promise<tripService.Trip[]> {
  const seen = new Set<string>();
  const trips: tripService.Trip[] = [];
  for (const variant of phoneVariants(driverPhone)) {
    for (const trip of await tripService.listCompletedByDriverInRange(variant, fromIso, toIso)) {
      if (trip.trip_id && !seen.has(trip.trip_id)) {
        seen.add(trip.trip_id);
        trips.push(trip);
      }
    }
  }
  return trips;
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

export type DriverProfileStats = {
  phone: string;
  rating: number;
  acceptance_rate: number;
  completion_rate: number;
  total_trips: number;
};

/** Pure: stats over a driver's trips (caller passes ALL of them, every phone format). */
export function buildProfile(driverPhone: string, trips: tripService.Trip[]): DriverProfileStats {
  const completed = trips.filter(t => t.status === 'completed');
  const offered = trips.filter(t =>
    ['confirmed', 'rejected', 'completed', 'calling', 'notified'].includes(t.status),
  );
  const accepted = trips.filter(t =>
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

const PROFILE_STATS_TTL_S = 300;

// Lifetime figures for the profile screen. The driver context only carries
// the 50 most recent trips per phone format (fine for lists), and the old
// stats were computed over that window with a strict driver_phone equality —
// so 'Tổng chuyến' read 21 while 27 trips were completed (25 stored as
// 0888…, 2 as +84888…). Cached 5 min; invalidated on any status change.
export async function profileForDriver(driverPhone: string): Promise<DriverProfileStats> {
  const key = driverProfileStatsKey(driverPhone);
  const cached = await cacheGet<DriverProfileStats>(key);
  if (cached) return cached;
  const seen = new Set<string>();
  const trips: tripService.Trip[] = [];
  for (const variant of phoneVariants(driverPhone)) {
    for (const trip of await tripService.listAllByDriver(variant)) {
      if (trip.trip_id && !seen.has(trip.trip_id)) {
        seen.add(trip.trip_id);
        trips.push(trip);
      }
    }
  }
  const stats = buildProfile(driverPhone, trips);
  await cacheSet(key, stats, PROFILE_STATS_TTL_S);
  return stats;
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
