/**
 * Layout/nav registry selfcheck — catches drift between routes, nav, and pages.
 * Run: npm run verify:layout
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ADMIN_MESSAGES } from '../src/i18n/messages.ts'
import {
  ADMIN_NAV_ITEMS,
  ADMIN_PROTECTED_ROUTES,
  PAGE_TITLE_KEYS,
  type AdminNavMessageKey,
} from '../src/layouts/navRegistry.ts'
import { ROUTES } from '../src/constants/routes.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), 'utf8')
}

const routesSrc = read('src/routes/index.tsx')
const appSrc = read('src/app/App.tsx')

const errors: string[] = []

for (const route of ADMIN_PROTECTED_ROUTES) {
  if (!PAGE_TITLE_KEYS[route]) {
    errors.push(`PAGE_TITLE_KEYS missing ${route}`)
  }
}

for (const item of ADMIN_NAV_ITEMS) {
  const key = Object.entries(ROUTES).find(([, v]) => v === item.route)?.[0]
  if (!key || !routesSrc.includes(`ROUTES.${key}`)) {
    errors.push(`routes/index.tsx missing ROUTES.${key ?? item.route}`)
  }
  for (const locale of ['en', 'vi'] as const) {
    const nav = ADMIN_MESSAGES[locale].nav[item.messageKey]
    if (!nav?.label.trim() || !nav?.description.trim()) {
      errors.push(`i18n ${locale} nav.${item.messageKey} needs label + description`)
    }
  }
}

for (const group of ['operations', 'people', 'system'] as const) {
  for (const locale of ['en', 'vi'] as const) {
    if (!ADMIN_MESSAGES[locale].groups[group]?.trim()) {
      errors.push(`i18n ${locale} groups.${group} missing label`)
    }
  }
}

const enNavKeys = Object.keys(ADMIN_MESSAGES.en.nav).sort()
const viNavKeys = Object.keys(ADMIN_MESSAGES.vi.nav).sort()
if (enNavKeys.join(',') !== viNavKeys.join(',')) {
  errors.push('i18n nav keys mismatch between en and vi')
}

for (const locale of ['en', 'vi'] as const) {
  const shell = ADMIN_MESSAGES[locale].shell
  if (!shell.searchPlaceholder || !shell.signOut || !shell.language || !shell.collapseSidebar) {
    errors.push(`i18n ${locale}.shell incomplete`)
  }
  const login = ADMIN_MESSAGES[locale].login
  if (!login.title || !login.submit || !login.failed) {
    errors.push(`i18n ${locale}.login incomplete`)
  }
}

const navKeys = new Set(ADMIN_NAV_ITEMS.map(i => i.messageKey))
for (const key of Object.keys(ADMIN_MESSAGES.en.nav) as AdminNavMessageKey[]) {
  if (!navKeys.has(key)) {
    errors.push(`ADMIN_MESSAGES.en.nav.${key} has no navRegistry item`)
  }
}

if (!appSrc.includes('SettingsShellLayout')) {
  errors.push('App.tsx must wrap authenticated routes with SettingsShellLayout')
}

if (appSrc.includes('Topbar')) {
  errors.push('App.tsx must not use legacy Topbar')
}

const pagesDir = path.join(root, 'src/pages')
const pageFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx') && f !== 'LoginPage.tsx')
if (pageFiles.length < ADMIN_NAV_ITEMS.length) {
  errors.push(`expected at least ${ADMIN_NAV_ITEMS.length} page modules, found ${pageFiles.length}`)
}

const t0 = performance.now()
ADMIN_NAV_ITEMS.forEach(i => ADMIN_MESSAGES.en.nav[i.messageKey].label)
const registryMs = performance.now() - t0

if (registryMs > 50) {
  errors.push(`nav registry scan slow: ${registryMs.toFixed(1)}ms (budget 50ms)`)
}

if (errors.length) {
  console.error('layout-selfcheck FAIL')
  for (const e of errors) console.error(' -', e)
  process.exit(1)
}

console.log(`layout-selfcheck ok routes=${ADMIN_PROTECTED_ROUTES.length} locales=en,vi registry_ms=${registryMs.toFixed(2)}`)
