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

function remindersKey(driverPhone: string): string {
  return `driver:reminders:${driverPhone.replace(/^\+/, '')}`;
}

export async function create(
  driverPhone: string,
  tripId: string,
  remindBeforeMinutes: number,
  type = 'PICKUP_REMINDER',
): Promise<Reminder> {
  const trip = await tripService.get(tripId);
  if (!trip) {
    throw new Error('TRIP_NOT_FOUND');
  }
  const pickupMs = Date.parse(trip.pickup_time || '');
  if (!trip.pickup_time || !Number.isFinite(pickupMs)) {
    throw new Error('NO_PICKUP_TIME');
  }
  const fireMs = pickupMs - remindBeforeMinutes * 60_000;
  const reminder: Reminder = {
    id: `${Date.now()}`,
    driver_phone: driverPhone,
    trip_id: tripId,
    remind_before_minutes: remindBeforeMinutes,
    type,
    created_at: new Date().toISOString(),
    fire_at: new Date(fireMs).toISOString(),
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
