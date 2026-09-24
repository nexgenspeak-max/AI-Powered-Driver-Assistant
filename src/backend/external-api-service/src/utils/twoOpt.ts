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

// precedenceOf[j] = index that MUST appear before j in the final order (a
// pickup, for a dropoff candidate), or null/undefined if j has no such
// requirement — this is what makes the two functions below solve a
// Pickup-and-Delivery Problem instead of a plain TSP when
// routeOptimizationService.ts includes both ends of a not-yet-picked-up
// trip as separate candidates. Omitting the argument entirely (all callers
// before this constraint existed) is equivalent to an all-null array, so
// existing behavior is unchanged.
export type PrecedenceOf = (number | null | undefined)[];

// costFromStart[i] = cost from the fixed starting point (driver's current
// location) to stop i. costMatrix[i][j] = cost from stop i to stop j.
// Returns a permutation of indices [0..n-1] (n = number of stops), NOT
// including the start.
export function nearestNeighborOrder(
  costFromStart: number[],
  costMatrix: number[][],
  precedenceOf: PrecedenceOf = [],
): number[] {
  const n = costFromStart.length;
  const visited = new Array(n).fill(false);
  const order: number[] = [];
  let current = -1; // -1 = still at the start

  for (let step = 0; step < n; step++) {
    let best = -1;
    let bestCost = Infinity;
    for (let j = 0; j < n; j++) {
      if (visited[j]) continue;
      const pred = precedenceOf[j];
      // Dropoff whose own pickup hasn't been visited yet — not eligible
      // this step. Every pickup itself has no predecessor, so at least one
      // candidate is always eligible each step (no risk of `best` staying
      // -1): precedence here is only ever one level deep (dropoff -> its
      // trip's pickup), never chained further.
      if (pred !== null && pred !== undefined && !visited[pred]) continue;
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

// True if every j with a precedenceOf[j] requirement appears after it in
// `order`. O(n) — cheap next to pathCost's own O(n) pass, called alongside
// it for every candidate reversal below.
function respectsPrecedence(order: number[], precedenceOf: PrecedenceOf): boolean {
  const positionOf = new Array(order.length);
  order.forEach((idx, pos) => { positionOf[idx] = pos; });
  for (let pos = 0; pos < order.length; pos++) {
    const pred = precedenceOf[order[pos]];
    if (pred !== null && pred !== undefined && positionOf[pred] > pos) return false;
  }
  return true;
}

// Bounded iteration count so a pathological input can't hang the request —
// in practice this converges in a handful of passes for driver-sized stop
// counts (single digits to low tens).
const MAX_PASSES = 200;

export function twoOptImprove(
  order: number[],
  costFromStart: number[],
  costMatrix: number[][],
  precedenceOf: PrecedenceOf = [],
): number[] {
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
        // A reversal can just as easily move a dropoff ahead of its own
        // pickup as improve the distance — reject those outright regardless
        // of cost, same as if they were never a valid move to begin with.
        if (!respectsPrecedence(candidate, precedenceOf)) continue;
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
export function optimizeOrder(
  costFromStart: number[],
  costMatrix: number[][],
  precedenceOf: PrecedenceOf = [],
): number[] {
  const initial = nearestNeighborOrder(costFromStart, costMatrix, precedenceOf);
  return twoOptImprove(initial, costFromStart, costMatrix, precedenceOf);
}
