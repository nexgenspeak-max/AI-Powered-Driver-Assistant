#!/usr/bin/env bash
# Compile driver-app for iOS Simulator — native gate (no physical device required).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SIM="${IOS_SIMULATOR:-iPhone 16 Pro}"
CONFIGURATION="${CONFIGURATION:-Debug}"

cd "$ROOT"

if [[ ! -d ios ]]; then
  echo "FAIL  ios/ missing — run: npx expo prebuild --platform ios" >&2
  exit 1
fi

WORKSPACE=$(find ios -maxdepth 1 -name '*.xcworkspace' | head -1)
SCHEME="${IOS_SCHEME:-driverapp}"
[[ -n "$WORKSPACE" ]] || { echo "FAIL  no xcworkspace in ios/" >&2; exit 1; }

# Resolve SPM once so DerivedData + checkouts exist before MapLibre copy
xcodebuild -resolvePackageDependencies -workspace "$WORKSPACE" -scheme "$SCHEME" >/dev/null 2>&1 || true

SIM_ID=$(xcrun simctl list devices available 2>/dev/null | rg "iPhone 16 Pro \(" | head -1 | rg -o '[A-F0-9-]{36}' || true)
if [[ -n "$SIM_ID" ]]; then
  xcrun simctl boot "$SIM_ID" 2>/dev/null || true
  DEST="platform=iOS Simulator,id=${SIM_ID}"
else
  DEST="generic/platform=iOS Simulator"
fi

do_build() {
  xcodebuild \
    -workspace "$WORKSPACE" \
    -scheme "$SCHEME" \
    -configuration "$CONFIGURATION" \
    -destination "$DEST" \
    -sdk iphonesimulator \
    build 2>&1
}

for attempt in 1 2; do
  bash "$ROOT/scripts/ensure-maplibre-ios.sh"
  echo "→ iOS simulator build attempt ${attempt} (${SCHEME}, ${DEST})…"
  set +e
  BUILD_OUT=$(do_build)
  CODE=$?
  set -e
  echo "$BUILD_OUT" | tail -20
  if [[ "$CODE" -eq 0 ]]; then
    echo "PASS  iOS simulator build — ${SCHEME} (attempt ${attempt})"
    exit 0
  fi
  if echo "$BUILD_OUT" | rg -q 'MapLibre.xcframework'; then
    echo "WARN  MapLibre artifact missing on attempt ${attempt} — re-ensuring and retrying…"
    continue
  fi
  echo "FAIL  iOS simulator build exited ${CODE}" >&2
  echo "$BUILD_OUT" | rg -i 'error:' | head -20 >&2 || true
  exit 1
done

echo "FAIL  iOS simulator build failed after MapLibre retry" >&2
exit 1
