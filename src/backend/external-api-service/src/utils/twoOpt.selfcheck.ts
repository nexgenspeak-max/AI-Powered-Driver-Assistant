// Pure-function checks for the multi-stop ordering — no network, no DB.
// Run: npm run verify:route-order
import assert from 'node:assert/strict';
import { nearestNeighborOrder, optimizeOrder, twoOptImprove } from './twoOpt';
import { orderingCosts } from '../services/routeOptimizationService';

function pathCost(order: number[], fromStart: number[], matrix: number[][]): number {
  let total = fromStart[order[0]];
  for (let i = 1; i < order.length; i++) total += matrix[order[i - 1]][order[i]];
  return total;
}

// 1. Precedence: a dropoff can never be visited before its own pickup, even
//    when the dropoff is the closest point to the driver.
{
  // stops: 0 = pickup A, 1 = dropoff A (right next to the driver), 2 = pickup B
  const fromStart = [5000, 100, 3000];
  const matrix = [
    [0, 4000, 2000],
    [4000, 0, 6000],
    [2000, 6000, 0],
  ];
  const precedence = [null, 0, null];
  const order = optimizeOrder(fromStart, matrix, precedence);
  assert.ok(order.indexOf(0) < order.indexOf(1), `pickup A must precede dropoff A, got ${order}`);
  assert.deepEqual([...order].sort(), [0, 1, 2]);
}

// 2. Duration beats distance: the short-but-jammed hop should lose to the
//    longer-but-faster one once travel times are available.
{
  const distFromStart = [3000, 5000];       // stop 0 is closer in metres
  const distMatrix = [[0, 4000], [4000, 0]];
  const durFromStart = [1500, 420];         // ...but 25 min away in traffic vs 7 min
  const durMatrix = [[0, 480], [480, 0]];

  const byDistance = orderingCosts(distFromStart, distMatrix, null, null);
  assert.equal(byDistance.basis, 'distance');
  assert.deepEqual(optimizeOrder(byDistance.costFromStart, byDistance.costMatrix), [0, 1]);

  const byDuration = orderingCosts(distFromStart, distMatrix, durFromStart, durMatrix);
  assert.equal(byDuration.basis, 'duration');
  assert.deepEqual(optimizeOrder(byDuration.costFromStart, byDuration.costMatrix), [1, 0]);
}

// 3. A single missing duration cell falls back to a distance-derived
//    estimate for that cell only; the basis stays 'duration'.
{
  const costs = orderingCosts([1000, 2000], [[0, 1000], [1000, 0]], [60, null], [[0, 60], [60, 0]]);
  assert.equal(costs.basis, 'duration');
  assert.equal(costs.costFromStart[0], 60);
  assert.ok(costs.costFromStart[1] > 0 && Number.isFinite(costs.costFromStart[1]));
}

// 4. 2-opt never makes the path worse than nearest-neighbour.
{
  const n = 7;
  const pts = Array.from({ length: n }, (_, i) => ({ x: Math.sin(i * 1.7) * 1000, y: Math.cos(i * 2.3) * 1000 }));
  const d = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
  const start = { x: 0, y: 0 };
  const fromStart = pts.map(p => d(start, p));
  const matrix = pts.map(a => pts.map(b => d(a, b)));
  const nn = nearestNeighborOrder(fromStart, matrix);
  const improved = twoOptImprove(nn, fromStart, matrix);
  assert.ok(pathCost(improved, fromStart, matrix) <= pathCost(nn, fromStart, matrix) + 1e-9);
  assert.deepEqual([...improved].sort((a, b) => a - b), Array.from({ length: n }, (_, i) => i));
}

process.stdout.write('twoOpt selfcheck: OK (precedence, duration-vs-distance, cell fallback, 2-opt monotonic)\n');
