/**
 * UI harness — web layout contract (ui-web.mdc), not mobile copy.
 * Run: npm run verify:ui
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'src')
const errors = []

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8')
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (/\.(tsx?|css)$/.test(entry.name)) files.push(full)
  }
  return files
}

const BANNED = ['#6c8aff', '#1a1f36', '#e8eaf0', '#0d1117', '#401f68']
const FORBIDDEN_FILES = [
  'src/features/home/components/AssistantScene.tsx',
  'src/features/home/components/AssistantCanvas.tsx',
  'src/features/home/components/AssistantAvatar.tsx',
  'src/components/PageShell.tsx',
]
const REQUIRED = [
  'src/components/AppShell.tsx',
  'src/components/AppSidebar.tsx',
  'src/components/PageHeader.tsx',
  'src/styles/palette.ts',
  'src/styles/theme.ts',
  'src/constants/status.ts',
  'src/components/RouteLine.tsx',
]

for (const rel of REQUIRED) {
  if (!fs.existsSync(path.join(root, rel))) errors.push(`missing ${rel}`)
}
for (const rel of FORBIDDEN_FILES) {
  if (fs.existsSync(path.join(root, rel))) errors.push(`forbidden file still present: ${rel}`)
}

const palette = read('src/styles/palette.ts')
if (!palette.includes("primary: '#8B5CF6'")) errors.push('palette must use mobile brand #8B5CF6')

const appShell = read('src/components/AppShell.tsx')
if (!appShell.includes('AppSidebar')) errors.push('AppShell must use AppSidebar')
if (!appShell.includes('Container')) errors.push('AppShell must use MUI Container')

const home = read('src/pages/HomePage.tsx')
if (home.includes('AssistantScene') || home.includes('AssistantCanvas')) {
  errors.push('HomePage must not mount 3D canvas')
}
if (!home.includes('AppShell')) errors.push('HomePage must use AppShell')

const chat = read('src/features/home/components/AssistantChatPanel.tsx')
if (chat.includes("position: 'absolute'")) errors.push('AssistantChatPanel must be embedded, not absolute overlay')

const authClient = read('src/services/api/authClient.ts')
if (!authClient.includes('Bearer')) errors.push('authClient must attach Bearer token')

for (const file of walk(srcDir)) {
  const rel = path.relative(root, file)
  const content = fs.readFileSync(file, 'utf8')
  for (const hex of BANNED) {
    if (content.includes(hex)) errors.push(`${rel} contains legacy hex ${hex}`)
  }
}

if (errors.length) {
  console.error('ui-harness failed:\n' + errors.map(e => `  - ${e}`).join('\n'))
  process.exit(1)
}

console.log('ui-harness ok')
