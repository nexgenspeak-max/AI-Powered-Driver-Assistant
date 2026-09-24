#!/usr/bin/env bash
# Mobile-native static checks — primary user surface is iOS/Android, not web.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FAIL=0

check_absent() {
  local label="$1"
  local pattern="$2"
  shift 2
  local hits
  hits=$(rg -n "$pattern" "$@" --glob '*.tsx' --glob '*.ts' \
    --glob '!**/*.web.tsx' \
    --glob '!**/node_modules/**' 2>/dev/null || true)
  if [[ -n "$hits" ]]; then
    echo "FAIL: $label"
    echo "$hits" | head -15
    FAIL=1
  else
    echo "OK: $label"
  fi
}

check_present() {
  local label="$1"
  local pattern="$2"
  shift 2
  if rg -q "$pattern" "$@" --glob '!**/node_modules/**' 2>/dev/null; then
    echo "OK: $label"
  else
    echo "FAIL: $label (not found)"
    FAIL=1
  fi
}

echo "=== driver-app mobile-check (native) ==="

# Native map + orb entry points (not web stubs)
check_present "native DriverMap.tsx exists" "export function DriverMap" src/features/home/components/DriverMap.tsx
check_present "native AssistantTabButton.tsx exists" "export function AssistantTabButton" src/components/AssistantTabButton.tsx
check_present "native NavigationBar.tsx exists" "export const NavigationBar" src/components/NavigationBar.tsx

# Mobile perf: background pause on native
check_present "useAppForeground pauses orb animations" "useAppForeground" src/hooks/useAppForeground.ts src/components/assistantTabButtonShared.tsx
check_present "reduceMotion on native orb" "AccessibilityInfo.isReduceMotionEnabled" src/components/assistantTabButtonShared.tsx
check_present "useFrameCallback gated (native audio level)" "frame\\.setActive" src/components/assistantTabButtonShared.tsx

# Native should not use web-only CSS anti-patterns in non-.web files
check_absent "mix-blend-mode in native TSX" "mix-blend-mode" src
check_absent "backdropFilter in native TSX" "backdropFilter" src

# Platform extension pairs for critical UI. NavigationBar.tsx is deliberately
# single-file (no Skia → no .web split needed, unlike the old glass tab bar).
PAIRS=(
  "src/components/AssistantTabButton.tsx:src/components/AssistantTabButton.web.tsx"
  "src/features/home/components/DriverMap.tsx:src/features/home/components/DriverMap.web.tsx"
)
for pair in "${PAIRS[@]}"; do
  native="${pair%%:*}"
  web="${pair##*:}"
  if [[ -f "$native" && -f "$web" ]]; then
    echo "OK: platform pair $(basename "$native") + .web"
  else
    echo "FAIL: missing platform pair $native / $web"
    FAIL=1
  fi
done

# Native touch + layout constants
check_present "SCROLL_TAB_BAR_CLEARANCE constant" "SCROLL_TAB_BAR_CLEARANCE" src/constants/layout.ts src/components/Screen.tsx
check_present "MAP_OVERLAY_BOTTOM_CLEARANCE" "MAP_OVERLAY_BOTTOM_CLEARANCE" src/constants/layout.ts

# Native map module wired
check_present "@maplibre/maplibre-react-native import" "@maplibre/maplibre-react-native" src/features/home/components/DriverMap.tsx

# iOS project present for native build
if [[ -d ios/driverapp.xcworkspace || -d ios/*.xcworkspace ]]; then
  echo "OK: ios/ native project present"
else
  WS=$(find ios -maxdepth 1 -name '*.xcworkspace' 2>/dev/null | head -1)
  if [[ -n "$WS" ]]; then
    echo "OK: ios/ workspace at $(basename "$WS")"
  else
    echo "FAIL: ios/ workspace missing — run npx expo prebuild"
    FAIL=1
  fi
fi

if [[ -d android/app ]]; then
  echo "OK: android/ native project present"
else
  echo "FAIL: android/app missing — run npx expo prebuild"
  FAIL=1
fi

if [[ "$FAIL" -ne 0 ]]; then
  exit 1
fi
echo "All mobile static checks passed."
