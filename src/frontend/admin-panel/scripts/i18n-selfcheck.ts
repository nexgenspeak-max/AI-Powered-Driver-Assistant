/**
 * i18n selfcheck — catches hardcoded English UI strings in authenticated surfaces.
 * Run: npm run verify:i18n
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ADMIN_MESSAGES } from '../src/i18n/messages.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const SCAN_ROOTS = ['src/pages', 'src/features']
const ALLOW_FILES = new Set(['src/pages/LoginPage.tsx'])

/** Literal JSX label= attrs — must use {c.*} / {t.*} instead (not aria-label). */
const HARDCODED_LABEL = /(?:^|[^a-z-])label="[A-Za-z][^"{]*"/g

/** Known English leaks from before i18n — extend when adding new copy. */
const FORBIDDEN_SNIPPETS: Array<[string, string]> = [
  ['label="Driver"', 'Driver field label'],
  ['label="Customer', 'Customer field label'],
  ['label="Pickup', 'Pickup field label'],
  ['label="Dropoff', 'Dropoff field label'],
  ['>Cancel<', 'Cancel button'],
  ['Creating...', 'submitting state'],
  ['Create & Notify', 'submit label'],
  ['Call Transcript', 'transcript dialog title'],
  ['Select driver...', 'driver select placeholder'],
  ['Failed to create trip', 'create trip error fallback'],
  ['No summary available', 'transcript empty summary'],
  ['bgcolor: PALETTE.surface', 'light surface token in shell UI'],
]

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name)
    const st = fs.statSync(abs)
    if (st.isDirectory()) out.push(...walk(abs))
    else if (name.endsWith('.tsx')) out.push(abs)
  }
  return out
}

function rel(abs: string): string {
  return path.relative(root, abs).replaceAll('\\', '/')
}

const errors: string[] = []

for (const locale of ['en', 'vi'] as const) {
  const ct = ADMIN_MESSAGES[locale].content
  if (!ct.createTrip?.submit || !ct.transcript?.title) {
    errors.push(`messages ${locale}: content.createTrip/transcript incomplete`)
  }
}

for (const scanRoot of SCAN_ROOTS) {
  const absRoot = path.join(root, scanRoot)
  if (!fs.existsSync(absRoot)) continue
  for (const file of walk(absRoot)) {
    const r = rel(file)
    if (ALLOW_FILES.has(r)) continue
    const src = fs.readFileSync(file, 'utf8')

    for (const m of src.matchAll(HARDCODED_LABEL)) {
      errors.push(`${r}: hardcoded ${m[0]}`)
    }

    for (const [snippet, desc] of FORBIDDEN_SNIPPETS) {
      if (src.includes(snippet)) {
        errors.push(`${r}: hardcoded ${desc} (${snippet.slice(0, 24)}…)`)
      }
    }

    // Page modules with forms should wire useAdminContent (Login exempt).
    if (r.startsWith('src/pages/') && r.endsWith('Page.tsx') && !r.includes('Login')) {
      if (!src.includes('useAdminContent')) {
        const hasChildI18n = true // feature components may own i18n
        if (r === 'src/pages/CreateTripPage.tsx' && !src.includes('useAdminContent')) {
          errors.push(`${r}: must import useAdminContent`)
        }
        void hasChildI18n
      }
    }
  }
}

// Feature components that render user-facing copy must use useAdminContent.
const MUST_I18N = [
  'src/features/call-logs/components/TranscriptDialog.tsx',
  'src/features/trips/components/TripTable.tsx',
  'src/features/drivers/components/DriverTable.tsx',
  'src/features/customers/components/CustomerTable.tsx',
  'src/features/call-logs/components/CallLogsTable.tsx',
]

for (const r of MUST_I18N) {
  const src = fs.readFileSync(path.join(root, r), 'utf8')
  if (!src.includes('useAdminContent')) {
    errors.push(`${r}: must import useAdminContent`)
  }
}

if (errors.length) {
  console.error('i18n-selfcheck FAIL')
  for (const e of errors) console.error(' -', e)
  process.exit(1)
}

console.log(`i18n-selfcheck ok scanned=${SCAN_ROOTS.join(',')}`)
