import * as tripService from './tripService';
import { phoneVariants } from '../utils/phone';

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
