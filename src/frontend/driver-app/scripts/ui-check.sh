#!/usr/bin/env bash
# Static UI guardrails — run before claiming UI work is done.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FAIL=0

# Shared exclusions: map layers, brand orb, theme config, auth glass theme
EXCLUDE=(
  --glob '!**/node_modules/**'
  --glob '!**/DriverMap.tsx'
  --glob '!**/DriverMap.web.tsx'
  --glob '!**/mapConstants.ts'
  --glob '!**/tamagui.config.ts'
  --glob '!**/theme.ts'
  --glob '!**/assistantTabButtonShared.tsx'
  --glob '!**/AssistantTabButton.tsx'
  --glob '!**/AssistantTabButton.web.tsx'
  --glob '!**/AssistantOrbCenter.tsx'
  --glob '!**/LiquidGlassTabBar.web.tsx'
  --glob '!**/GlossyAvatar.tsx'
  --glob '!**/GlossyAvatar.web.tsx'
  --glob '!**/GlassButton.tsx'
  --glob '!**/SegmentedControl.tsx'
  --glob '!**/SuccessCheck.tsx'
  --glob '!**/Toggle.tsx'
  --glob '!**/VehicleTypeSelect.tsx'
  --glob '!**/BonusList.tsx'
)

check() {
  local label="$1"
  local pattern="$2"
  shift 2
  local hits
  hits=$(rg -n "$pattern" "$@" "${EXCLUDE[@]}" 2>/dev/null || true)
  if [[ -n "$hits" ]]; then
    echo "FAIL: $label"
    echo "$hits" | head -20
    FAIL=1
  else
    echo "OK: $label"
  fi
}

echo "=== driver-app UI check ==="
check "paddingBottom: 100 (use Screen / SCROLL_TAB_BAR_CLEARANCE)" \
  "paddingBottom: 100" app src

check "fontSize: 11 (min 12px caption)" \
  "fontSize: 11" app src/components src/features

check "hardcoded purple hex in JSX props" \
  "(color|backgroundColor|borderColor)=.*#8B5CF6|(color|backgroundColor|borderColor)=.*#7C3AED" \
  app src/features src/components

check "raw numeric gap={2|4|8} (use \$1/\$2 tokens)" \
  "gap=\{(2|4|8)\}" src/features src/components/RouteLine.tsx app

check "Tamagui Text import in features (use AppText)" \
  "import \{[^}]*\bText\b[^}]*\} from 'tamagui'" src/features

# Active pill must be fill-only — stroke + bar rim = double border (Trang chủ corner).
if rg -q "borderColor: 'rgba\\(168,85,247" src/components/LiquidGlassTabBar.web.tsx 2>/dev/null; then
  echo "FAIL: active tab pill border on LiquidGlassTabBar.web (fill-only — see ui-mobile §7)"
  FAIL=1
else
  echo "OK: tab pill fill-only (no stacked rim stroke)"
fi

if [[ "$FAIL" -ne 0 ]]; then
  exit 1
fi
echo "All UI checks passed."
