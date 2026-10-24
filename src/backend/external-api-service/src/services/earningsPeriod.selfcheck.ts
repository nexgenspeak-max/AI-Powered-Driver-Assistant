// Run: npm run verify:earnings-period
import assert from 'node:assert/strict';
import { isEarningsPeriod, periodRange } from './earningsService';

// Wednesday 2026-10-21 14:30 local.
const now = new Date(2026, 9, 21, 14, 30, 0, 0);
const day = 86400000;

const y = periodRange('yesterday', now);
assert.equal(y.from.getTime(), new Date(2026, 9, 20).getTime(), 'yesterday starts at 00:00 of the previous day');
assert.equal(y.to.getTime(), new Date(2026, 9, 21).getTime(), 'yesterday ends at today 00:00 (exclusive of today)');

const lw = periodRange('last_week', now);
assert.equal(lw.from.getTime(), new Date(2026, 9, 12).getTime(), 'last_week starts on the previous Monday');
assert.equal(lw.to.getTime(), new Date(2026, 9, 19).getTime(), 'last_week ends at this Monday 00:00');

// Sunday: "tuần trước" is still Mon–Sun of the week before, not the week that ends today.
const sun = periodRange('last_week', new Date(2026, 9, 25, 9, 0));
assert.equal(sun.from.getTime(), new Date(2026, 9, 12).getTime(), 'on a Sunday, last week is still the previous Mon–Sun');
assert.equal(sun.to.getTime(), new Date(2026, 9, 19).getTime());

const w = periodRange('week', now);
assert.equal(w.to.getTime(), now.getTime(), 'week ends now');
assert.equal(w.from.getTime(), now.getTime() - 7 * day, 'week is a rolling 7 days');
assert.equal(periodRange('month', now).from.getTime(), now.getTime() - 30 * day, 'month is a rolling 30 days');

assert.ok(isEarningsPeriod('last_week') && isEarningsPeriod('yesterday'));
assert.ok(!isEarningsPeriod('lifetime') && !isEarningsPeriod(undefined), 'unknown periods are rejected by the route');
process.stdout.write('earnings period selfcheck: OK (yesterday = previous calendar day, last_week = previous Mon-Sun)\n');
