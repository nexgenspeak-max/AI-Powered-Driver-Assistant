// A generic 2-opt local-search heuristic for an OPEN path (not a closed
// loop) — the driver doesn't need to return to their starting point after
// the last stop, unlike a classic round-trip TSP solver. Operates purely on
// a precomputed cost matrix (meters or seconds, caller's choice) so it works
// identically whether costs came from a real road-distance matrix or a
// haversine fallback — no I/O, no coordinates, trivially unit-testable.
//
// Not guaranteed globally optimal (that's factorially expensive beyond a
// handful of stops — see routeOptimizationService.ts's comment on why),
// but nearest-neighbor + 2-opt is the standard, fast, "good enough"
// approximation used by real-world routing systems at this scale.

// costFromStart[i] = cost from the fixed starting point (driver's current
// location) to stop i. costMatrix[i][j] = cost from stop i to stop j.
// Returns a permutation of indices [0..n-1] (n = number of stops), NOT
// including the start.
export function nearestNeighborOrder(costFromStart: number[], costMatrix: number[][]): number[] {
  const n = costFromStart.length;
  const visited = new Array(n).fill(false);
  const order: number[] = [];
  let current = -1; // -1 = still at the start

  for (let step = 0; step < n; step++) {
    let best = -1;
    let bestCost = Infinity;
    for (let j = 0; j < n; j++) {
      if (visited[j]) continue;
      const cost = current === -1 ? costFromStart[j] : costMatrix[current][j];
      if (cost < bestCost) {
        bestCost = cost;
        best = j;
      }
    }
    visited[best] = true;
    order.push(best);
    current = best;
  }
  return order;
}

function pathCost(order: number[], costFromStart: number[], costMatrix: number[][]): number {
  let total = costFromStart[order[0]];
  for (let i = 1; i < order.length; i++) total += costMatrix[order[i - 1]][order[i]];
  return total;
}

function reversedSegment(order: number[], i: number, k: number): number[] {
  return [...order.slice(0, i), ...order.slice(i, k + 1).reverse(), ...order.slice(k + 1)];
}

// Bounded iteration count so a pathological input can't hang the request —
// in practice this converges in a handful of passes for driver-sized stop
// counts (single digits to low tens).
const MAX_PASSES = 200;

export function twoOptImprove(order: number[], costFromStart: number[], costMatrix: number[][]): number[] {
  const n = order.length;
  if (n < 3) return order; // nothing to reorder with fewer than 3 stops

  let best = order.slice();
  let bestCost = pathCost(best, costFromStart, costMatrix);
  let improved = true;
  let passes = 0;

  while (improved && passes < MAX_PASSES) {
    improved = false;
    passes++;
    for (let i = 0; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const candidate = reversedSegment(best, i, k);
        const candidateCost = pathCost(candidate, costFromStart, costMatrix);
        if (candidateCost < bestCost - 1e-9) {
          best = candidate;
          bestCost = candidateCost;
          improved = true;
        }
      }
    }
  }
  return best;
}

// Convenience: nearest-neighbor construction, then 2-opt refinement.
export function optimizeOrder(costFromStart: number[], costMatrix: number[][]): number[] {
  const initial = nearestNeighborOrder(costFromStart, costMatrix);
  return twoOptImprove(initial, costFromStart, costMatrix);
}
