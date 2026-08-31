#!/usr/bin/env bash
# Admin panel UI contract checks — run via npm run verify
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

fail() { echo "ui-check FAIL: $1" >&2; exit 1; }

# Authenticated pages must use SettingsShellLayout (via App.tsx), not legacy DashboardLayout
if rg -q "from ['\"].*DashboardLayout['\"]" src/pages 2>/dev/null; then
  fail "pages import DashboardLayout directly — use SettingsShellLayout via App shell"
fi

# Layout registry is the nav source of truth
test -f src/layouts/navRegistry.ts || fail "missing src/layouts/navRegistry.ts"
test -f src/layouts/SettingsShellLayout.tsx || fail "missing SettingsShellLayout"

# No new topbar pattern
test ! -f src/layouts/Topbar.tsx || fail "legacy Topbar.tsx should be removed"

# Off-grid spacing anti-pattern in layouts (sample)
if rg -q 'spacing:\s*"[0-9]+px"' src/layouts 2>/dev/null; then
  fail "off-grid px spacing in layouts — use MUI 8px units"
fi

# Shell tokens present
rg -q 'shellSidebar' src/styles/palette.ts || fail "palette missing shell tokens"

# Bilingual admin UI (EN + VI)
test -f src/i18n/messages.ts || fail "missing src/i18n/messages.ts"
test -f src/i18n/localeRegistry.ts || fail "missing src/i18n/localeRegistry.ts"
rg -q "en:" src/i18n/messages.ts && rg -q "vi:" src/i18n/messages.ts || fail "i18n must define en and vi"
test -f scripts/i18n-selfcheck.ts || fail "missing scripts/i18n-selfcheck.ts"

echo "ui-check ok"
