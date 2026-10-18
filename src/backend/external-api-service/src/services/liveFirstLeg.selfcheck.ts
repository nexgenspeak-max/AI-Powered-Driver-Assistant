// Run: npm run verify:live-first-leg
import assert from 'node:assert/strict';
import { withLiveFirstLeg, type OptimizedRoute } from './routeOptimizationService';
import { distanceMeters } from '../utils/geo';

const pickup = { lat: 21.043, lng: 105.837 };
const dropoff = { lat: 21.0318, lng: 105.8125 };
const nearPickup = { lat: 21.042, lng: 105.8372 }; // where the route was computed
const route: OptimizedRoute = {
  stops: [
    { trip_id: 't1', kind: 'pickup', address: 'Đền Quán Thánh', customer_name: 'Hà', ...pickup, distance_m: 356, eta_minutes: 2 },
    { trip_id: 't1', kind: 'dropoff', address: 'Lotte Center', customer_name: 'Hà', ...dropoff, distance_m: 3700, eta_minutes: 11 },
  ],
  source: 'goong_matrix', cost_basis: 'duration',
  total_distance_m: 4056, total_duration_s: 13 * 60,
  computed_at: '2026-10-18T07:00:00Z', driver_location: nearPickup, path: [],
};

// Barely moved: untouched (no churn on GPS jitter).
assert.equal(withLiveFirstLeg(route, { lat: 21.0421, lng: 105.8372 }), route);
assert.equal(withLiveFirstLeg(route, null), route);
assert.equal(withLiveFirstLeg(null, nearPickup), null);

// Moved ~2.4 km away: first leg re-estimated from the live fix, later legs kept.
const live = { lat: 21.0285, lng: 105.8542 };
const out = withLiveFirstLeg(route, live)!;
const straight = distanceMeters(live, pickup);
assert.ok(out.stops[0].distance_m >= straight && out.stops[0].distance_m <= straight * 2, `leg ${out.stops[0].distance_m} vs straight ${straight}`);
assert.ok(out.stops[0].eta_minutes > route.stops[0].eta_minutes, 'ETA grows with distance');
assert.deepEqual(out.stops[1], route.stops[1]);
assert.equal(out.total_distance_m, route.total_distance_m - 356 + out.stops[0].distance_m);
assert.deepEqual(out.driver_location, live);
process.stdout.write(`live first leg selfcheck: OK (${(out.stops[0].distance_m / 1000).toFixed(1)} km, ${out.stops[0].eta_minutes} min after a 2.4 km move)\n`);
