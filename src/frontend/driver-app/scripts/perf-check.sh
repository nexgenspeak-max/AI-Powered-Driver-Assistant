#!/usr/bin/env bash
# Static performance guardrails — catches known CPU/battery anti-patterns in source.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FAIL=0

EXCLUDE=(
  --glob '!**/node_modules/**'
  --glob '!**/AssistantTabButton.web.tsx'
  --glob '!**/LiquidGlassTabBar.web.tsx'
  --glob '!**/GlassMaterial.tsx'
  --glob '!**/GlassPanel.tsx'
)

check() {
  local label="$1"
  local pattern="$2"
  shift 2
  local hits
  hits=$(rg -n "$pattern" "$@" "${EXCLUDE[@]}" 2>/dev/null || true)
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
  local hits
  hits=$(rg -n "$pattern" "$@" "${EXCLUDE[@]}" 2>/dev/null || true)
  if [[ -z "$hits" ]]; then
    echo "FAIL: $label (pattern not found)"
    FAIL=1
  else
    echo "OK: $label"
  fi
}

echo "=== driver-app perf check (static) ==="
check "mix-blend-mode in UI (web GPU hog)" "mix-blend-mode" src/components src/features
check "filter: blur in styles (prefer expo-blur/CSS sparingly)" "filter:\s*blur|filter:\s*'blur" src/components src/features
check_present "assistant orb useFrameCallback gated by setActive" "frame\\.setActive" src/components/assistantTabButtonShared.tsx
check "withRepeat.*-1 on web assistant orb (web uses CSS)" "withRepeat" src/components/AssistantTabButton.web.tsx

# Informational — expected background work (not failures)
echo ""
echo "--- Expected background load (informational) ---"
echo "GPS watchPositionAsync (3s/5m): src/features/home/hooks/useLiveDriverLocation.ts"
echo "Wake-word Vosk (hands-free ON): src/features/assistant-wakeword/wakeWordService.ts"
echo "LiveKit WebRTC (voice connected): src/features/home/stores/voiceSessionStore.ts"
echo "MapLibre GPU (home tab): src/features/home/components/DriverMap.tsx"

if [[ "$FAIL" -ne 0 ]]; then
  exit 1
fi
echo "All static perf checks passed."
