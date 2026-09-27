/* Pure-logic checks for recordService date handling: npm run verify:records */
import assert from 'node:assert/strict';
import { dayBoundsUtc, recordDateOf } from './recordService';

assert.equal(recordDateOf('2026-09-27T10:00:00+00:00'), '2026-09-27');
assert.equal(recordDateOf('2026-09-27T17:00:00+00:00'), '2026-09-28'); // 00:00 in Vietnam
assert.equal(recordDateOf('2026-09-27T16:59:59.999Z'), '2026-09-27');
assert.throws(() => recordDateOf('not-a-date'));
const b = dayBoundsUtc('2026-09-28');
assert.equal(b.from, '2026-09-27T17:00:00.000Z');
assert.equal(b.to, '2026-09-28T17:00:00.000Z');
console.log('verify:records ok');
