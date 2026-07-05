import * as tripService from './tripService';

const FARE_PER_KM = 12000;
const BASE_FARE = 15000;

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export function tripFare(trip: tripService.Trip): number {
  const km = Number(trip.distance_km) || 0;
  return Math.round(BASE_FARE + km * FARE_PER_KM);
}

export function enrichTrip(trip: tripService.Trip) {
  return { ...trip, estimated_fare: tripFare(trip) };
}

export async function todayForDriver(driverPhone: string) {
  const trips = await tripService.listByDriver(driverPhone, 100);
  const completedToday = trips.filter(
    t => t.status === 'completed' && isToday(t.updated_at || t.created_at),
  );
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
  const trips = await tripService.listByDriver(driverPhone, 200);
  const days = period === 'month' ? 30 : 7;
  const cutoff = Date.now() - days * 86400000;
  const inPeriod = trips.filter(t => {
    if (t.status !== 'completed') return false;
    return new Date(t.updated_at || t.created_at).getTime() >= cutoff;
  });
  const total = inPeriod.reduce((sum, t) => sum + tripFare(t), 0);
  return {
    period,
    total_earnings: total,
    trip_count: inPeriod.length,
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
