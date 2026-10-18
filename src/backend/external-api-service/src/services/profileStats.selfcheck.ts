// Run: npm run verify:profile-stats
import assert from 'node:assert/strict';
import { buildProfile } from './earningsService';

const t = (status: string, booked_via = 'app') => ({ trip_id: Math.random().toString(36), status, booked_via } as never);

// 3 accepted (2 completed, 1 cancelled by driver), 1 rejected, 2 still waiting, 1 walk-up.
const stats = buildProfile('0900000001', [
  t('completed'), t('completed'), t('cancelled_by_driver'), t('rejected'),
  t('notified'), t('calling'), t('completed', 'driver'),
]);
assert.equal(stats.total_trips, 3, 'walk-up completions still count as trips');
assert.equal(stats.acceptance_rate, 75, 'waiting offers are not decided; walk-ups are not offers');
assert.equal(stats.completion_rate, 75, '3 completed of 4 finished (incl. walk-up completion)');
assert.equal(buildProfile('x', [t('notified')]).acceptance_rate, 100, 'no decided offers yet');
process.stdout.write('profile stats selfcheck: OK (pending offers excluded, walk-ups not offers)\n');
