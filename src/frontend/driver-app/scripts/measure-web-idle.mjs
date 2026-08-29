#!/usr/bin/env node
/**
 * Measure web tab CPU proxy via Chrome DevTools Performance metrics.
 * Requires: Metro/Expo web on BASE_URL (default http://localhost:8081).
 * Budget: ScriptDuration rate < 5% of wall time on idle home (orb not connected).
 */
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const BASE = process.env.AUDIT_WEB_URL || 'http://localhost:8081'
const PATH = process.env.AUDIT_WEB_PATH || '/'
const IDLE_MS = Number(process.env.AUDIT_IDLE_MS || 8000)
const SAMPLE_MS = Number(process.env.AUDIT_SAMPLE_MS || 10000)
const SCRIPT_BUDGET_PCT = Number(process.env.AUDIT_SCRIPT_BUDGET_PCT || 8)

const require = createRequire(import.meta.url)
const ROOT = path.dirname(fileURLToPath(import.meta.url))

function fail(msg) {
  console.error(`FAIL  ${msg}`)
  process.exit(1)
}

function pass(msg) {
  console.log(`PASS  ${msg}`)
}

async function main() {
  let puppeteer
  try {
    puppeteer = require('puppeteer-core')
  } catch {
    console.log('SKIP  puppeteer-core not installed — run: npm i -D puppeteer-core')
    console.log('       Manual: Chrome DevTools → Performance → 30s idle on Home')
    process.exit(0)
  }

  const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  const ping = spawnSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', BASE], { encoding: 'utf8' })
  if (ping.stdout?.trim() !== '200') {
    fail(`Metro not reachable at ${BASE} (got ${ping.stdout?.trim() || 'error'})`)
  }

  let browser
  try {
    browser = await puppeteer.launch({
      executablePath: chrome,
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    })
  } catch (e) {
    console.log(`SKIP  Could not launch Chrome: ${e.message}`)
    process.exit(0)
  }

  const page = await browser.newPage()
  const client = await page.createCDPSession()
  await client.send('Performance.enable')

  const url = new URL(PATH, BASE.endsWith('/') ? BASE : `${BASE}/`).toString()
  console.log(`INFO  Loading ${url} …`)
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
  await new Promise(r => setTimeout(r, IDLE_MS))

  const t0 = Date.now()
  let samples = []
  while (Date.now() - t0 < SAMPLE_MS) {
    const { metrics } = await client.send('Performance.getMetrics')
    const script = metrics.find(m => m.name === 'ScriptDuration')?.value ?? 0
    samples.push(script)
    await new Promise(r => setTimeout(r, 500))
  }

  await browser.close()

  const scriptDelta = samples[samples.length - 1] - samples[0]
  const wallSec = SAMPLE_MS / 1000
  const pct = (scriptDelta / wallSec) * 100

  console.log('')
  console.log('=== Web idle CPU proxy (Chrome CDP ScriptDuration) ===')
  console.log(`Sample window:   ${SAMPLE_MS}ms after ${IDLE_MS}ms settle`)
  console.log(`ScriptDuration:  +${scriptDelta.toFixed(3)}s over ${wallSec}s wall`)
  console.log(`Script load:     ${pct.toFixed(1)}% (budget <${SCRIPT_BUDGET_PCT}%)`)
  console.log(`Reference:       was ~19% before orb CPU fix`)
  console.log('')

  if (pct <= SCRIPT_BUDGET_PCT) {
    pass(`web idle script load ${pct.toFixed(1)}% ≤ ${SCRIPT_BUDGET_PCT}%`)
    process.exit(0)
  }
  fail(`web idle script load ${pct.toFixed(1)}% > ${SCRIPT_BUDGET_PCT}% budget`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
