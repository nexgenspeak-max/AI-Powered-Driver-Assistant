#!/usr/bin/env bash
# Compile driver-app for Android (debug) — native gate when SDK present.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d android/app ]]; then
  echo "FAIL  android/app missing — run: npx expo prebuild --platform android" >&2
  exit 1
fi

if [[ -z "${ANDROID_HOME:-}" && ! -f android/local.properties ]]; then
  echo "SKIP  Android SDK not configured (set ANDROID_HOME or android/local.properties)"
  exit 0
fi

echo "→ Assembling debug APK (compile check)…"
set +e
BUILD_OUT=$(cd android && ./gradlew assembleDebug --no-daemon -q 2>&1)
CODE=$?
set -e

if [[ "$CODE" -eq 0 ]]; then
  APK=$(find android/app/build/outputs/apk/debug -name '*.apk' 2>/dev/null | head -1)
  echo "PASS  Android debug build${APK:+ — $APK}"
  exit 0
fi

echo "FAIL  Android assembleDebug exited ${CODE}" >&2
echo "$BUILD_OUT" | tail -25 >&2
exit 1
