/**
 * Layout/nav registry selfcheck — no TypeScript loader required.
 * Run: npm run verify:layout
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8')
}

const routesSrc = read('src/routes/index.tsx')
const appSrc = read('src/app/App.tsx')
const navSrc = read('src/layouts/navRegistry.ts')
const messagesSrc = read('src/i18n/messages.ts')
const errors = []

const NAV_KEYS = ['overview', 'reports', 'agent', 'tools', 'prompts', 'logs', 'calls']
const ROUTE_CONST = ['OVERVIEW', 'REPORTS', 'AGENT', 'TOOLS', 'PROMPTS', 'LOGS', 'CALLS']
const GROUPS = ['observe', 'agent', 'activity']

for (const key of ROUTE_CONST) {
  if (!routesSrc.includes(`ROUTES.${key}`)) {
    errors.push(`routes/index.tsx missing ROUTES.${key}`)
  }
}

for (const key of NAV_KEYS) {
  for (const locale of ['en:', 'vi:']) {
    if (!messagesSrc.includes(locale)) {
      errors.push(`messages.ts missing ${locale} block`)
    }
  }
  if (!messagesSrc.includes(`${key}:`)) {
    errors.push(`messages.ts missing nav.${key}`)
  }
  if (!navSrc.includes(`messageKey: '${key}'`)) {
    errors.push(`navRegistry missing ${key}`)
  }
}

for (const group of GROUPS) {
  if (!messagesSrc.includes(`${group}:`)) {
    errors.push(`messages.ts missing group ${group}`)
  }
}

if (messagesSrc.includes('domains:')) {
  errors.push('messages.ts must not hardcode tool domain catalogs')
}

if (!appSrc.includes('SettingsShellLayout')) {
  errors.push('App.tsx must wrap authenticated routes with SettingsShellLayout')
}

const pickerSrc = read('src/components/LocalePicker.tsx')
if (!pickerSrc.includes('<Select')) {
  errors.push('LocalePicker must be a Select dropdown, not a stacked list')
}

const treeNav = path.join(root, 'src/layouts/VoiceTreeNav.tsx')
if (!fs.existsSync(treeNav)) {
  errors.push('missing VoiceTreeNav (in-sidebar treeview)')
} else {
  const treeSrc = fs.readFileSync(treeNav, 'utf8')
  if (treeSrc.includes('CascadeMenu') || treeSrc.includes('<Menu')) {
    errors.push('VoiceTreeNav must be an in-place tree, not a popup Menu')
  }
  if (!treeSrc.includes('Collapse')) {
    errors.push('VoiceTreeNav must expand/collapse in the sidebar')
  }
}

const pagesDir = path.join(root, 'src/pages')
const pageFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx') && f !== 'LoginPage.tsx')
if (pageFiles.length < NAV_KEYS.length) {
  errors.push(`expected at least ${NAV_KEYS.length} page modules, found ${pageFiles.length}`)
}

if (errors.length) {
  process.stderr.write(errors.map(e => ` - ${e}`).join('\n') + '\n')
  process.exit(1)
}

process.stdout.write(`layout ok (${NAV_KEYS.length} pages, en+vi)\n`)
