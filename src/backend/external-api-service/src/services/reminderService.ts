import { cacheGet, cacheSet } from '../cache/redis';
import * as tripService from './tripService';

export interface Reminder {
  id: string;
  driver_phone: string;
  trip_id: string;
  remind_before_minutes: number;
  type: string;
  created_at: string;
  fire_at: string;
  customer_name: string;
  pickup_address: string;
}

const SCHEDULE_KEY = 'driver:reminders:schedule';

type GetTrip = (tripId: string) => Promise<{ pickup_time?: string; customer_name?: string; pickup_address?: string } | null>;
const defaultGetTrip: GetTrip = (tripId) => tripService.get(tripId);

function fireAt(pickupTime: string | undefined, remindBeforeMinutes: number): string {
  const pickupMs = Date.parse(pickupTime || '');
  if (!pickupTime || !Number.isFinite(pickupMs)) throw new Error('NO_PICKUP_TIME');
  return new Date(pickupMs - remindBeforeMinutes * 60_000).toISOString();
}

function remindersKey(driverPhone: string): string {
  return `driver:reminders:${driverPhone.replace(/^\+/, '')}`;
}

export async function create(
  driverPhone: string,
  tripId: string,
  remindBeforeMinutes: number,
  type = 'PICKUP_REMINDER',
  getTrip: GetTrip = defaultGetTrip,
): Promise<Reminder> {
  const trip = await getTrip(tripId);
  if (!trip) {
    throw new Error('TRIP_NOT_FOUND');
  }
  const fire = fireAt(trip.pickup_time, remindBeforeMinutes);
  const reminder: Reminder = {
    id: `${Date.now()}`,
    driver_phone: driverPhone,
    trip_id: tripId,
    remind_before_minutes: remindBeforeMinutes,
    type,
    created_at: new Date().toISOString(),
    fire_at: fire,
    customer_name: trip.customer_name || '',
    pickup_address: trip.pickup_address || '',
  };
  const key = remindersKey(driverPhone);
  const existing = (await cacheGet<Reminder[]>(key)) ?? [];
  existing.push(reminder);
  await cacheSet(key, existing, 86400);
  const schedule = (await cacheGet<Reminder[]>(SCHEDULE_KEY)) ?? [];
  schedule.push(reminder);
  await cacheSet(SCHEDULE_KEY, schedule, 86400);
  return reminder;
}

export async function list(driverPhone: string): Promise<Reminder[]> {
  return (await cacheGet<Reminder[]>(remindersKey(driverPhone))) ?? [];
}

/**
 * Change how many minutes before pickup a reminder fires (AVDA-41). The fire
 * time is recomputed from the trip's current pickup time, in the driver's list
 * and in the shared schedule. A reminder that already fired is NOT_FOUND.
 */
export async function update(
  driverPhone: string,
  id: string,
  remindBeforeMinutes: number,
  getTrip: GetTrip = defaultGetTrip,
): Promise<Reminder> {
  const key = remindersKey(driverPhone);
  const mine = (await cacheGet<Reminder[]>(key)) ?? [];
  const current = mine.find(r => r.id === id);
  const schedule = (await cacheGet<Reminder[]>(SCHEDULE_KEY)) ?? [];
  if (!current || !schedule.some(r => r.id === id)) throw new Error('REMINDER_NOT_FOUND');
  const trip = await getTrip(current.trip_id);
  if (!trip) throw new Error('TRIP_NOT_FOUND');
  const updated: Reminder = { ...current, remind_before_minutes: remindBeforeMinutes, fire_at: fireAt(trip.pickup_time, remindBeforeMinutes) };
  await cacheSet(key, mine.map(r => (r.id === id ? updated : r)), 86400);
  await cacheSet(SCHEDULE_KEY, schedule.map(r => (r.id === id ? updated : r)), 86400);
  return updated;
}

/** Remove due reminders from the schedule and return them. */
export async function takeDue(now = Date.now(), driverPhone?: string): Promise<Reminder[]> {
  const schedule = (await cacheGet<Reminder[]>(SCHEDULE_KEY)) ?? [];
  const due: Reminder[] = [];
  const keep: Reminder[] = [];
  for (const item of schedule) {
    const fire = Date.parse(item.fire_at);
    const mine = !driverPhone || item.driver_phone === driverPhone;
    if (mine && Number.isFinite(fire) && fire <= now) {
      due.push(item);
    } else {
      keep.push(item);
    }
  }
  if (due.length > 0) {
    await cacheSet(SCHEDULE_KEY, keep, 86400);
  }
  return due;
}
