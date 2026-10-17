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
