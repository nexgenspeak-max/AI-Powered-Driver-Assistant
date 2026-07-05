import { cacheGet, cacheSet } from '../cache/redis';

export interface Reminder {
  id: string;
  driver_phone: string;
  trip_id: string;
  remind_before_minutes: number;
  type: string;
  created_at: string;
}

function remindersKey(driverPhone: string): string {
  return `driver:reminders:${driverPhone.replace(/^\+/, '')}`;
}

export async function create(
  driverPhone: string,
  tripId: string,
  remindBeforeMinutes: number,
  type = 'PICKUP_REMINDER',
): Promise<Reminder> {
  const reminder: Reminder = {
    id: `${Date.now()}`,
    driver_phone: driverPhone,
    trip_id: tripId,
    remind_before_minutes: remindBeforeMinutes,
    type,
    created_at: new Date().toISOString(),
  };
  const key = remindersKey(driverPhone);
  const existing = (await cacheGet<Reminder[]>(key)) ?? [];
  existing.push(reminder);
  await cacheSet(key, existing, 86400);
  return reminder;
}

export async function list(driverPhone: string): Promise<Reminder[]> {
  return (await cacheGet<Reminder[]>(remindersKey(driverPhone))) ?? [];
}
