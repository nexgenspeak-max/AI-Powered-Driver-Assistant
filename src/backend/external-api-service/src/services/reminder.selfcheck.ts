/**
 * Reminder create/update/fire contract (AVDA-41, AVDA-42) on the in-memory cache
 * (REDIS_URL unset). Run: npm run verify:reminders
 */
import * as reminderService from './reminderService';

function check(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  process.stdout.write(`ok   ${msg}\n`);
}

const PICKUP = '2026-10-15T09:00:00.000Z';
const trips: Record<string, { pickup_time?: string; customer_name: string; pickup_address: string }> = {
  t1: { pickup_time: PICKUP, customer_name: 'An', pickup_address: 'Lotte' },
  t2: { customer_name: 'Bình', pickup_address: 'Q1' },
};
const getTrip = async (id: string) => trips[id] ?? null;

async function rejects(fn: () => Promise<unknown>, message: string, msg: string): Promise<void> {
  try { await fn(); } catch (err) { check(err instanceof Error && err.message === message, msg); return; }
  throw new Error(`FAIL: ${msg} (no error)`);
}

async function main(): Promise<void> {
  const r = await reminderService.create('0900000001', 't1', 15, 'PICKUP_REMINDER', getTrip);
  check(r.fire_at === '2026-10-15T08:45:00.000Z', 'create: fires 15 min before pickup');
  await rejects(() => reminderService.create('0900000001', 't2', 10, 'PICKUP_REMINDER', getTrip), 'NO_PICKUP_TIME', 'create: trip without pickup time rejected');

  const u = await reminderService.update('0900000001', r.id, 5, getTrip);
  check(u.fire_at === '2026-10-15T08:55:00.000Z' && u.remind_before_minutes === 5, 'update: fire time recomputed (5 min before)');
  check((await reminderService.list('0900000001'))[0].fire_at === u.fire_at, 'update: driver list reflects the change');
  await rejects(() => reminderService.update('0900000001', 'nope', 5, getTrip), 'REMINDER_NOT_FOUND', 'update: unknown reminder -> not found');

  const fire = Date.parse(u.fire_at);
  check((await reminderService.takeDue(fire - 30_000)).length === 0, 'fire: not due 30 s before its time');
  const due = await reminderService.takeDue(fire + 30_000);
  check(due.length === 1 && due[0].id === r.id, 'fire: due within 30 s after its time (±30 s window)');
  check((await reminderService.takeDue(fire + 60_000)).length === 0, 'fire: delivered once, removed from schedule');
  await rejects(() => reminderService.update('0900000001', r.id, 10, getTrip), 'REMINDER_NOT_FOUND', 'update after firing -> not found');
  process.stdout.write('reminders selfcheck passed\n');
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
