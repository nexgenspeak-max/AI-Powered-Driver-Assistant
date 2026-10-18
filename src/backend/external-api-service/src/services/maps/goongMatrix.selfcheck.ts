// Tiling checks for goong.getDistanceMatrix against a fake Goong that, like
// the real one, answers HTTP 400 above 100 cells. No network.
// Run: npm run verify:goong-matrix
import assert from 'node:assert/strict';
import { getDistanceMatrix } from './goong';
import type { LatLng } from '../../utils/geo';

let calls: { o: number; d: number }[] = [];
let failCall: number | null = null;

// Cell value encodes (origin, destination) so stitching errors show up.
const enc = (p: string) => p.split('|').map(s => Number(s.split(',')[0]));
globalThis.fetch = (async (url: string) => {
  const q = new URL(url).searchParams;
  const o = enc(q.get('origins')!);
  const d = enc(q.get('destinations')!);
  calls.push({ o: o.length, d: d.length });
  const status = o.length * d.length > 100 || calls.length - 1 === failCall ? 400 : 200;
  const body = status === 200
    ? { rows: o.map(oi => ({ elements: d.map(di => ({ status: 'OK', distance: { value: oi * 1000 + di }, duration: { value: oi + di } })) })) }
    : { message: 'too many elements' };
  return { ok: status === 200, status, json: async () => body } as Response;
}) as typeof fetch;

const pts = (n: number): LatLng[] => Array.from({ length: n }, (_, i) => ({ lat: i, lng: 105 }));

async function main() {
  // 11 x 10 (GPS fix + 10 stops) — the size that used to 400.
  calls = []; failCall = null;
  let m = await getDistanceMatrix(pts(11), pts(10), 'k');
  assert.ok(m);
  assert.ok(calls.every(c => c.o * c.d <= 100), 'every tile within 100 cells');
  assert.equal(m.rows.length, 11);
  for (let i = 0; i < 11; i++) for (let j = 0; j < 10; j++) assert.equal(m.rows[i][j].distance_m, i * 1000 + j);

  // Small matrix stays a single request.
  calls = [];
  m = await getDistanceMatrix(pts(4), pts(3), 'k');
  assert.equal(calls.length, 1);

  // More than 100 destinations: columns are tiled too.
  calls = [];
  m = await getDistanceMatrix(pts(2), pts(130), 'k');
  assert.ok(m && calls.every(c => c.o * c.d <= 100));
  assert.equal(m.rows[1][129].distance_m, 1000 + 129);

  // One failed tile only blanks its own cells.
  calls = []; failCall = 1;
  m = await getDistanceMatrix(pts(21), pts(10), 'k');
  assert.ok(m);
  const nulls = m.rows.flat().filter(c => c.distance_m === null).length;
  assert.equal(nulls, 100, 'exactly the failed 10x10 tile is null');
  assert.equal(m.rows[0][0].distance_m, 0);

  // Every tile failing still means "fall back to haversine".
  calls = []; failCall = 0;
  assert.equal(await getDistanceMatrix(pts(3), pts(3), 'k'), null);

  console.log('goong matrix selfcheck: OK (≤100-cell tiles, stitching, column tiling, partial failure, total failure)');
}

main().catch(err => { console.error(err); process.exit(1); });
