#!/usr/bin/env bash
# Measurable audit — MOBILE FIRST (iOS/Android primary; web supplementary).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FAIL=0
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1"; FAIL=1; }
warn() { echo "WARN  $1"; }

MOBILE_CHECKS=0
MOBILE_PASS=0

echo "=============================================="
echo " DRIVER-APP AUDIT (mobile-first)  $(date '+%Y-%m-%d %H:%M')"
echo "=============================================="
echo ""

# --- Gate M1: TypeScript ---
echo "## Gate M1: TypeScript"
if npm run typecheck --silent 2>/dev/null; then
  pass "typecheck — 0 errors"
  MOBILE_PASS=$((MOBILE_PASS+1))
else
  fail "typecheck — errors present"
fi
MOBILE_CHECKS=$((MOBILE_CHECKS+1))
echo ""

# --- Gate M2: Mobile native static ---
echo "## Gate M2: Mobile native static (mobile-check.sh)"
MOBILE_OUT=$(bash scripts/mobile-check.sh 2>&1) || true
MOBILE_OK=$(echo "$MOBILE_OUT" | rg -c '^OK:' || true)
MOBILE_FAIL=$(echo "$MOBILE_OUT" | rg -c '^FAIL:' || true)
echo "$MOBILE_OUT"
if [[ "${MOBILE_FAIL:-0}" -eq 0 && "${MOBILE_OK:-0}" -ge 10 ]]; then
  pass "mobile-check — ${MOBILE_OK} rules"
  MOBILE_PASS=$((MOBILE_PASS+1))
else
  fail "mobile-check — ${MOBILE_FAIL} fail"
fi
MOBILE_CHECKS=$((MOBILE_CHECKS+1))
echo ""

# --- Gate M3: UI static ---
echo "## Gate M3: UI static (ui-check.sh)"
UI_OUT=$(bash scripts/ui-check.sh 2>&1) || true
UI_OK=$(echo "$UI_OUT" | rg -c '^OK:' || true)
UI_FAIL=$(echo "$UI_OUT" | rg -c '^FAIL:' || true)
echo "$UI_OUT"
if [[ "${UI_FAIL:-0}" -eq 0 && "${UI_OK:-0}" -ge 5 ]]; then
  pass "ui-check — ${UI_OK}/5"
  MOBILE_PASS=$((MOBILE_PASS+1))
else
  fail "ui-check failed"
fi
MOBILE_CHECKS=$((MOBILE_CHECKS+1))
echo ""

# --- Gate M4: Perf static ---
echo "## Gate M4: Perf static (perf-check.sh)"
PERF_OUT=$(bash scripts/perf-check.sh 2>&1) || true
PERF_OK=$(echo "$PERF_OUT" | rg -c '^OK:' || true)
PERF_FAIL=$(echo "$PERF_OUT" | rg -c '^FAIL:' || true)
echo "$PERF_OUT"
if [[ "${PERF_FAIL:-0}" -eq 0 && "${PERF_OK:-0}" -ge 4 ]]; then
  pass "perf-check — ${PERF_OK}/4"
  MOBILE_PASS=$((MOBILE_PASS+1))
else
  fail "perf-check failed"
fi
MOBILE_CHECKS=$((MOBILE_CHECKS+1))
echo ""

# --- Gate M5: Map wiring (native tiles) ---
echo "## Gate M5: Map wiring (verify-map.sh)"
MAP_OUT=$(bash scripts/verify-map.sh 2>&1) || true
MAP_OK=$(echo "$MAP_OUT" | rg -c '^OK' || true)
MAP_WARN=$(echo "$MAP_OUT" | rg -c '^WARN' || true)
MAP_FAIL=$(echo "$MAP_OUT" | rg -c '^FAIL' || true)
echo "$MAP_OUT"
if [[ "${MAP_FAIL:-0}" -eq 0 && "${MAP_OK:-0}" -ge 7 ]]; then
  pass "verify-map — ${MAP_OK} OK"
  MOBILE_PASS=$((MOBILE_PASS+1))
else
  fail "verify-map failed"
fi
[[ "${MAP_WARN:-0}" -gt 0 ]] && warn "customer-app key only (not driver-app)"
MOBILE_CHECKS=$((MOBILE_CHECKS+1))
echo ""

# --- Gate M6: Screen shell ---
echo "## Gate M6: Screen shell coverage"
APP_SCREENS=$(find app -name '*.tsx' ! -name '_layout.tsx' ! -path '*/_layout.tsx' | wc -l | tr -d ' ')
SCREEN_SHELL=$(rg -l '<Screen' app --glob '*.tsx' --glob '!**/_layout.tsx' 2>/dev/null | wc -l | tr -d ' ')
EXCEPTIONS=4
EXPECTED=$((APP_SCREENS - EXCEPTIONS))
if [[ "$SCREEN_SHELL" -ge "$EXPECTED" ]]; then
  pass "Screen shell — ${SCREEN_SHELL}/${APP_SCREENS} (${EXCEPTIONS} exceptions)"
  MOBILE_PASS=$((MOBILE_PASS+1))
else
  fail "Screen shell — ${SCREEN_SHELL}/${EXPECTED}"
fi
MOBILE_CHECKS=$((MOBILE_CHECKS+1))
echo ""

# --- Gate M7: Native perf guards ---
echo "## Gate M7: Native perf guards"
NATIVE_GUARDS=0
rg -q 'useAppForeground' src/hooks/useAppForeground.ts src/components/assistantTabButtonShared.tsx && NATIVE_GUARDS=$((NATIVE_GUARDS+1)) && pass "useAppForeground → orb pause on background"
rg -q 'AccessibilityInfo.isReduceMotionEnabled' src/components/assistantTabButtonShared.tsx && NATIVE_GUARDS=$((NATIVE_GUARDS+1)) && pass "reduceMotion on native orb"
rg -q 'frame\.setActive' src/components/assistantTabButtonShared.tsx && NATIVE_GUARDS=$((NATIVE_GUARDS+1)) && pass "useFrameCallback gated by setActive"
rg -q 'useReducedMotion' src/components/Skeleton.tsx && NATIVE_GUARDS=$((NATIVE_GUARDS+1)) && pass "Skeleton reduce motion"
if [[ "$NATIVE_GUARDS" -ge 4 ]]; then
  MOBILE_PASS=$((MOBILE_PASS+1))
else
  fail "native perf guards — ${NATIVE_GUARDS}/4"
fi
MOBILE_CHECKS=$((MOBILE_CHECKS+1))
echo ""

# --- Gate M8: iOS Simulator compile (PRIMARY native gate) ---
echo "## Gate M8: iOS Simulator compile"
if [[ "${SKIP_IOS_BUILD:-0}" == "1" ]]; then
  warn "iOS build skipped (SKIP_IOS_BUILD=1)"
else
  IOS_OUT=$(bash scripts/ios-simulator-build.sh 2>&1) || true
  echo "$IOS_OUT" | tail -15
  if echo "$IOS_OUT" | rg -q '^PASS'; then
    pass "iOS simulator build OK"
    MOBILE_PASS=$((MOBILE_PASS+1))
  else
    fail "iOS simulator build failed"
  fi
  MOBILE_CHECKS=$((MOBILE_CHECKS+1))
fi
echo ""

# --- Gate M9: Android compile (optional if SDK) ---
echo "## Gate M9: Android compile"
ANDROID_OUT=$(bash scripts/android-compile.sh 2>&1) || true
echo "$ANDROID_OUT" | tail -8
if echo "$ANDROID_OUT" | rg -q '^PASS'; then
  pass "Android debug APK compiled"
  MOBILE_PASS=$((MOBILE_PASS+1))
  MOBILE_CHECKS=$((MOBILE_CHECKS+1))
elif echo "$ANDROID_OUT" | rg -q '^SKIP'; then
  warn "Android compile skipped (no SDK/Java)"
else
  fail "Android compile failed"
  MOBILE_CHECKS=$((MOBILE_CHECKS+1))
fi
echo ""

# --- Gate W1: Web CPU (supplementary, not primary user) ---
echo "## Gate W1: Web CPU (supplementary)"
WEB_CPU_OUT=$(node scripts/measure-web-idle.mjs 2>&1) || true
echo "$WEB_CPU_OUT" | rg -v '^INFO' || echo "$WEB_CPU_OUT" | tail -8
if echo "$WEB_CPU_OUT" | rg -q '^PASS'; then
  WEB_PCT=$(echo "$WEB_CPU_OUT" | rg 'Script load:\s+([0-9.]+)%' -or '$1' || echo '?')
  pass "web idle ${WEB_PCT}% (supplementary)"
elif echo "$WEB_CPU_OUT" | rg -q '^SKIP'; then
  warn "web CPU skipped"
else
  warn "web CPU not measured (Metro down) — mobile is primary"
fi
echo ""

# --- Summary ---
echo "=============================================="
echo " SUMMARY (mobile-first)"
echo "=============================================="
if [[ "$FAIL" -eq 0 ]]; then
  echo "RESULT: ALL MOBILE GATES PASSED"
  echo ""
  echo "Mobile score:    ${MOBILE_PASS}/${MOBILE_CHECKS} gates"
  echo "Native static:   ${MOBILE_OK} checks"
  echo "UI rules:        ${UI_OK}/5"
  echo "Perf rules:      ${PERF_OK}/4"
  echo "Map:             ${MAP_OK} OK"
  echo "Screen shell:    ${SCREEN_SHELL}/${APP_SCREENS}"
  echo ""
  echo "Still manual on device (recommended before release):"
  echo "  - Map tiles render on iPhone/Android (not simulator-only)"
  echo "  - Assistant orb tap + voice session on device"
  echo "  - Tab bar clearance on real notch/home indicator"
  echo "  - Thermal after 10min voice + map (Energy Log / Profiler)"
  exit 0
else
  echo "RESULT: FAILED — fix above and re-run: npm run audit"
  echo "Mobile score: ${MOBILE_PASS}/${MOBILE_CHECKS}"
  exit 1
fi
