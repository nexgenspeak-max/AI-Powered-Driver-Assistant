// Run: npm run verify:list-recent
import assert from 'node:assert/strict';
import { newestTrips } from './tripService';

const t = (id: string, created_at: string) => ({ trip_id: id, created_at } as never);

// Scan order is hash order: the newest trip can come last.
const scanned = [t('b', '2026-11-07T18:39:14Z'), t('c', '2026-10-18T15:11:00Z'), t('a', '2026-11-08T04:29:15Z')];
assert.deepEqual(newestTrips(scanned, 2).map((x: { trip_id: string }) => x.trip_id), ['a', 'b'], 'newest first, cut to limit');
assert.equal(newestTrips(scanned, 10).length, 3, 'limit above size keeps all');
assert.deepEqual(newestTrips([t('x', ''), t('y', '2026-01-01T00:00:00Z')], 1).map((x: { trip_id: string }) => x.trip_id), ['y'], 'missing created_at sorts last');
process.stdout.write('list recent selfcheck: OK (newest trips across scan pages)\n');
