/**
 * Contract for PATCH /api/v1/drivers/me/status offline guard (AVDA-119).
 * Run: npm run verify:driver-status
 */
import { offlineBlockedBy } from './guard';

function check(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  process.stdout.write(`ok   ${msg}\n`);
}

const trips = [
  { trip_id: 't1', status: 'completed' },
  { trip_id: 't2', status: 'picked_up' },
  { trip_id: 't3', status: 'cancelled' },
];
check(offlineBlockedBy(false, trips).join() === 't2', 'offline is blocked by an in-progress trip');
check(offlineBlockedBy(false, [{ trip_id: 'a', status: 'confirmed' }, { trip_id: 'b', status: 'arrived_pickup' }]).length === 2,
  'confirmed and arrived_pickup also block');
check(offlineBlockedBy(false, [{ trip_id: 't1', status: 'completed' }, { trip_id: 't4', status: 'pending' }]).length === 0,
  'offline allowed when no accepted trip is unfinished');
check(offlineBlockedBy(true, trips).length === 0, 'going online is never blocked');
check(offlineBlockedBy(false, []).length === 0, 'offline allowed with no trips');
process.stdout.write('driver status guard selfcheck passed\n');
