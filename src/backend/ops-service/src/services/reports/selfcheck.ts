/* Daily report logic without AWS or network: part of npm run verify:ops */
import assert from 'node:assert/strict';
import { aggregate, exchanges, modeOf, sample } from './aggregate';
import { tally } from './judge';
import { ReportRecord, SessionMetrics } from './types';

function metrics(mode: string, samples: number[], extra: Partial<SessionMetrics> = {}): SessionMetrics {
  return {
    schema: 1, mode, turns: samples.length,
    latency_ms: { samples, mean: null, p50: null, p95: null, max: null, slow: 0 },
    fillers: 0,
    tools: { total: 0, errors: 0, by_name: {} },
    http: { total: 0, errors: 0, by_error: {} },
    fallbacks: {}, errors: {},
    ...extra,
  };
}

const records: ReportRecord[] = [
  { call_id: 'a', caller: '0901', started_at: '2026-09-27T01:00:00Z', duration_seconds: 60, mode: 'driver',
    turns: [{ role: 'user', text: 'còn mấy chuyến', ts: 1 }, { role: 'assistant', text: 'Bạn còn 2 chuyến.', ts: 2 }],
    metrics: metrics('driver', [800, 1600, 2400], {
      fillers: 1,
      tools: { total: 4, errors: 1, by_name: {} },
      http: { total: 5, errors: 1, by_error: { 'PATCH /api/v1/trips/T 500': 1 } },
      errors: { http: 1 }, fallbacks: { 'llm:openai': 1 },
    }) },
  { call_id: 'b', caller: '0901', started_at: '2026-09-27T02:00:00Z', duration_seconds: 30, mode: 'driver',
    turns: [], metrics: metrics('driver', [1000]) },
  { call_id: 'c', caller: '0902', started_at: '2026-09-27T03:00:00Z', duration_seconds: 20, mode: 'outbound', turns: [] },
  { call_id: 'd', caller: '0777', started_at: '2026-09-27T04:00:00Z', duration_seconds: 40, mode: 'customer', turns: [] },
  { call_id: 'e', caller: '0901', started_at: '2026-09-27T05:00:00Z', duration_seconds: 10, mode: 'customer_bridge', turns: [] },
];

const r = aggregate('2026-09-27', records, new Date('2026-09-28T00:00:00Z'));
assert.equal(r.activity.sessions, 4);                 // customer leg is not a session
assert.equal(r.activity.customer_calls, 1);
assert.equal(r.activity.drivers_served, 2);           // 0901, 0902
assert.equal(r.activity.customers_served, 1);
assert.deepEqual(r.activity.sessions_by_mode, { driver: 2, outbound: 1, customer: 1 });
assert.equal(r.latency_ms.turns_measured, 4);
assert.equal(r.latency_ms.mean, 1450);
assert.equal(r.latency_ms.max, 2400);
assert.equal(r.latency_ms.slow_ratio, 0.25);
assert.equal(r.latency_ms.meets_nfr02, false);        // p95 = 2400 ms
assert.equal(r.accuracy.tool_success_rate, 0.75);
assert.equal(r.accuracy.http_error_rate, 0.2);
assert.deepEqual(r.errors.top_http, [{ key: 'PATCH /api/v1/trips/T 500', count: 1 }]);
assert.equal(r.errors.sessions_with_errors, 1);
assert.equal(r.fallbacks.total, 1);
assert.equal(r.coverage.with_metrics, 2);
assert.equal(r.coverage.notes.length, 1);             // two sessions without metrics

// legacy records (no mode field): mode comes from the room name in call_id
assert.equal(modeOf({ call_id: 'driver-0901-4f1c', caller: '0901', started_at: '', duration_seconds: 0, turns: [] }), 'driver');
assert.equal(modeOf({ call_id: 'trip-ab12', caller: '0902', started_at: '', duration_seconds: 0, turns: [] }), 'outbound');
assert.equal(modeOf({ call_id: 'custcall-ab12-1', caller: '0903', started_at: '', duration_seconds: 0, turns: [] }), 'customer_call');
assert.equal(modeOf({ call_id: 'customer-0777-x', caller: '0777', started_at: '', duration_seconds: 0, turns: [] }), 'customer');
assert.equal(modeOf({ call_id: 'driver-0901-x', caller: '0901', started_at: '', duration_seconds: 0, turns: [], mode: 'outbound' }), 'outbound');

const ex = exchanges(records);
assert.equal(ex.length, 1);
assert.equal(ex[0].user, 'còn mấy chuyến');
assert.deepEqual(sample([1, 2, 3, 4, 5], 3, 'd'), sample([1, 2, 3, 4, 5], 3, 'd')); // reproducible
assert.equal(sample([1, 2], 5, 'd').length, 2);

const j = tally(
  [ex[0], ex[0], ex[0]],
  JSON.stringify({ results: [{ i: 1, verdict: 'correct' }, { i: 2, verdict: 'incorrect', reason: 'sai' }] }),
  'gpt-4o-mini',
);
assert.equal(j.correct, 1);
assert.equal(j.incorrect, 1);
assert.equal(j.unclear, 1);                           // item 3 not graded
assert.equal(j.correct_rate, 0.5);
assert.equal(tally([ex[0]], 'not json', 'm').unclear, 1);
console.log('reports selfcheck ok');
