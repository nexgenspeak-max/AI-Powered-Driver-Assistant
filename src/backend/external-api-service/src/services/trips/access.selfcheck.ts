/**
 * Trip access rule used by GET/POST /api/v1/trips/:tripId/location (AVDA-48).
 * Run: npm run verify:trip-access
 */
import { isTripOwner } from './access';

function check(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  process.stdout.write(`ok   ${msg}\n`);
}

const trip = { driver_phone: '+84900000001', customer_phone: '0901111111' };
check(isTripOwner({ role: 'driver', phone: '0900000001' }, trip), 'driver of the trip (0… vs +84…) may read its location');
check(!isTripOwner({ role: 'driver', phone: '0900000002' }, trip), 'another driver may not');
check(isTripOwner({ role: 'customer', phone: '+84901111111' }, trip), 'customer of the trip may');
check(!isTripOwner({ role: 'customer', phone: '0909999999' }, trip), 'another customer may not');
check(isTripOwner({ role: 'customer', sub: 'acc-1', phone: '0909999999' }, { ...trip, id_account: 'acc-1' }),
  'customer matched by account id when the trip has one');
check(!isTripOwner({ role: 'customer', sub: 'acc-2', phone: '0901111111' }, { ...trip, id_account: 'acc-1' }),
  'account id wins over phone');
check(isTripOwner({ role: 'admin' }, trip), 'admin / service caller (voice agent) may');
check(!isTripOwner({ role: 'driver' }, trip), 'driver token without phone may not');
check(!isTripOwner({ role: 'driver', phone: '0900000001' }, { customer_phone: '0901111111' }), 'unassigned trip is not readable by a driver');
process.stdout.write('trip access selfcheck passed\n');
