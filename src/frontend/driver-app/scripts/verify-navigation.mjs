// Pure-math checks for the in-app navigation HUD (step advance, remaining
// distance from the live position, off-route detection). No device, no
// Metro: bundles the TS source with esbuild and runs it under Node.
//   npm run verify:navigation
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import assert from 'node:assert/strict'

const here = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(here, '..')
const require = createRequire(import.meta.url)

function loadEsbuild() {
  const candidates = [
    path.join(appRoot, 'node_modules', 'esbuild'),
    path.resolve(appRoot, '..', '..', 'backend', 'external-api-service', 'node_modules', 'esbuild'),
  ]
  for (const c of candidates) {
    try {
      return require(c)
    } catch {
      /* try next */
    }
  }
  throw new Error('esbuild not found — run `npm install` in src/backend/external-api-service')
}

const esbuild = loadEsbuild()
const built = await esbuild.build({
  entryPoints: [path.join(appRoot, 'src', 'features', 'home', 'lib', 'navigationMath.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  logLevel: 'silent',
})
const code = built.outputFiles[0].text
const mod = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const { advanceStepIndex, remainingFromPosition, offRouteTick, OFF_ROUTE_TICKS, REROUTE_MIN_INTERVAL_MS } = mod

// ~ Hanoi, 1e-4 deg lat ≈ 11 m; 1e-4 deg lng ≈ 10.4 m.
const P = (lat, lng) => ({ lat, lng })
const step = (from, to, m, s) => ({ instruction: '', maneuver: '', distance_m: m, duration_s: s, start_location: from, end_location: to })

// A straight road heading north with three short legs.
const A = P(21.0000, 105.8000)
const B = P(21.0010, 105.8000) // ~111 m north of A
const C = P(21.0012, 105.8000) // ~22 m past B (short leg)
const D = P(21.0030, 105.8000) // ~200 m past C
const steps = [step(A, B, 111, 20), step(B, C, 22, 4), step(C, D, 200, 36)]

// 1. Within 35 m of B -> advance one step.
assert.equal(advanceStepIndex(P(21.0008, 105.8000), steps, 0), 1)

// 2. Sparse tick that jumped past both B and C (now 60 m past C): the old
//    35 m-only rule would be stuck at index 0; overshoot rule lands on 2.
assert.equal(advanceStepIndex(P(21.0018, 105.8000), steps, 0), 2)

// 3. Still 80 m before B -> stays at 0.
assert.equal(advanceStepIndex(P(21.0003, 105.8000), steps, 0), 0)

// 4. Remaining from a position halfway along the first leg counts only the
//    part still ahead (~55 m) + the rest (222 m), not the whole 333 m.
const rem = remainingFromPosition(P(21.0005, 105.8000), steps, 0)
assert.ok(rem.km >= 0.2 && rem.km <= 0.3, `remaining km ${rem.km}`)
assert.ok(rem.min === 1, `remaining min ${rem.min}`)
assert.deepEqual(remainingFromPosition(null, [], 0), null)

// 5. Off-route: 3 consecutive ticks >50 m away, then throttled re-route.
const path2 = [A, B, C, D]
const onRoute = offRouteTick(P(21.0005, 105.8001), path2, 0, 0, 100_000) // ~10 m east
assert.deepEqual(onRoute, { ticks: 0, offRoute: false, shouldReroute: false })
const far = P(21.0005, 105.8010) // ~104 m east of the road
let t = 0
let r
for (let i = 0; i < OFF_ROUTE_TICKS; i++) {
  r = offRouteTick(far, path2, t, 0, 100_000)
  t = r.ticks
}
assert.equal(r.offRoute, true)
assert.equal(r.shouldReroute, true)
// Same tick but a re-route happened 5 s ago -> off-route yes, re-fetch no.
const throttled = offRouteTick(far, path2, t, 100_000 - 5_000, 100_000)
assert.equal(throttled.offRoute, true)
assert.equal(throttled.shouldReroute, false)
assert.ok(REROUTE_MIN_INTERVAL_MS >= 10_000)
// Empty path never counts as off-route.
assert.equal(offRouteTick(far, [], 5, 0, 1).offRoute, false)

console.log('navigation selfcheck: OK (step advance + overshoot, remaining-from-position, off-route detection + throttle)')

// ── Live-push cadence (lib/pushCadence.ts) ─────────────────────────────
{
  const builtCadence = await esbuild.build({
    entryPoints: [path.join(appRoot, 'src', 'features', 'home', 'lib', 'pushCadence.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    logLevel: 'silent',
  })
  const c = await import(`data:text/javascript;base64,${Buffer.from(builtCadence.outputFiles[0].text).toString('base64')}`)
  const pickup = { lat: 21.048, lng: 105.844 }
  const far = { lat: 21.0285, lng: 105.8542 } // ~2.4 km
  const veryFar = { lat: 21.0, lng: 105.8 } // ~6.6 km
  const t0 = 1_000_000

  // No active stop: idle 10-min ping only.
  assert.equal(c.pushPolicy(far, []).intervalMs, c.IDLE_INTERVAL_MS)
  assert.equal(c.shouldPush({ now: t0 + 60_000, lastPushAt: t0, here: far, lastPushed: veryFar, stops: [] }), false, 'idle: moving 5 km does not push before 10 min')
  // First fix always pushes.
  assert.equal(c.shouldPush({ now: t0, lastPushAt: 0, here: far, lastPushed: null, stops: [pickup] }), true)
  // En route (> 3 km): 60 s or 500 m.
  assert.equal(c.pushPolicy(veryFar, [pickup]).intervalMs, c.EN_ROUTE_INTERVAL_MS)
  assert.equal(c.shouldPush({ now: t0 + 30_000, lastPushAt: t0, here: veryFar, lastPushed: veryFar, stops: [pickup] }), false)
  assert.equal(c.shouldPush({ now: t0 + 61_000, lastPushAt: t0, here: veryFar, lastPushed: veryFar, stops: [pickup] }), true)
  // Near (<= 3 km): 15 s, or 150 m moved.
  assert.equal(c.pushPolicy(far, [pickup]).intervalMs, c.NEAR_INTERVAL_MS)
  const moved200 = { lat: far.lat + 0.0018, lng: far.lng } // ~200 m north
  assert.equal(c.shouldPush({ now: t0 + 5_000, lastPushAt: t0, here: moved200, lastPushed: far, stops: [pickup] }), true, 'near: 200 m move pushes immediately')
  assert.equal(c.shouldPush({ now: t0 + 5_000, lastPushAt: t0, here: far, lastPushed: far, stops: [pickup] }), false)
  assert.equal(c.shouldPush({ now: t0 + 16_000, lastPushAt: t0, here: far, lastPushed: far, stops: [pickup] }), true)
  // At 30 km/h (~8.3 m/s) the worst gap near a stop is 150 m, so a 1 km radius can't be skipped.
  console.log('push cadence selfcheck: OK (idle 10 min, en route 60 s/500 m, near stop 15 s/150 m)')
}

// ── Live next-stop leg (lib/liveLeg.ts) ────────────────────────────────
{
  const b = await esbuild.build({ entryPoints: [path.join(appRoot, 'src', 'features', 'home', 'lib', 'liveLeg.ts')], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' })
  const { liveLeg } = await import(`data:text/javascript;base64,${Buffer.from(b.outputFiles[0].text).toString('base64')}`)
  const stop = { lat: 21.0434, lng: 105.8366 }
  const origin = { lat: 21.0285, lng: 105.8542 } // ~2.4 km straight
  // No live fix: server figures as-is.
  assert.deepEqual(liveLeg({ serverDistanceM: 4000, serverEtaMin: 15, routeOrigin: origin, live: null, stop }), { distanceKm: 4, etaMinutes: 15 })
  // Live fix ~400 m from the stop: card must no longer say 4 km / 15 min.
  const near = { lat: 21.0400, lng: 105.8400 }
  const r = liveLeg({ serverDistanceM: 4000, serverEtaMin: 15, routeOrigin: origin, live: near, stop })
  assert.ok(r.distanceKm < 1.2 && r.distanceKm > 0.4, `near distance ${r.distanceKm}`)
  assert.ok(r.etaMinutes <= 5, `near eta ${r.etaMinutes}`)
  // At the origin: roughly the server figure (detour clamped to <= 2x).
  const atOrigin = liveLeg({ serverDistanceM: 4000, serverEtaMin: 15, routeOrigin: origin, live: origin, stop })
  assert.ok(Math.abs(atOrigin.distanceKm - 4) < 0.05, `origin distance ${atOrigin.distanceKm}`)
  console.log('live leg selfcheck: OK (server figures without GPS, shrinks as the driver closes in)')
}

// ── Accent-insensitive search (utils/search.ts) ────────────────────────
{
  const b = await esbuild.build({ entryPoints: [path.join(appRoot, 'src', 'utils', 'search.ts')], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' })
  const { matchesQuery, foldVi } = await import(`data:text/javascript;base64,${Buffer.from(b.outputFiles[0].text).toString('base64')}`)
  assert.equal(foldVi('Đặng Mỹ Linh'), 'dang my linh')
  assert.ok(matchesQuery('nguyen van', ['Nguyễn Văn Nam', '0901']))
  assert.ok(matchesQuery('dang linh', ['Đặng Mỹ Linh']))
  assert.ok(matchesQuery('0903', ['Đặng Mỹ Linh', '0903111007']))
  assert.ok(matchesQuery('', ['x']))
  assert.ok(!matchesQuery('lan', ['Đặng Mỹ Linh']))
  console.log('search selfcheck: OK (accent-insensitive, every word, phone digits)')
}
