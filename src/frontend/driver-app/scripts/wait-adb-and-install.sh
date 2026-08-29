#!/usr/bin/env bash
# Wait for a wireless/USB adb device, then install the debug APK.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APK="$ROOT/android/app/build/outputs/apk/debug/app-debug.apk"
ADB="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb"
if [[ ! -x "$ADB" ]]; then
  ADB="$HOME/android/platform-tools/adb"
fi
if [[ ! -x "$ADB" ]]; then
  echo "adb not found"
  exit 127
fi

if [[ ! -f "$APK" ]]; then
  echo "APK missing — run: cd android && ./gradlew assembleDebug"
  exit 1
fi

# Optional: adb connect 192.168.x.x:PORT before running this script.
echo "Waiting for adb device (turn on Wireless debugging on phone)..."
for i in $(seq 1 60); do
  if "$ADB" devices | awk 'NR>1 && $2=="device" {found=1} END {exit !found}'; then
    echo "Device found — installing..."
    "$ADB" install -r "$APK"
    echo "Done. Open driver-app on your phone."
    exit 0
  fi
  sleep 5
done

echo "No device after 5 minutes. On Honor: Developer options → Wireless debugging → ON, then:"
echo "  adb connect <ip>:<debug-port>"
exit 1
