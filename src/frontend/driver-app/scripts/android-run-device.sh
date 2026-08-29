#!/usr/bin/env bash
# Build and install driver-app on a connected Android device (USB or wireless adb).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

source "${HOME}/.zshrc" 2>/dev/null || true

if ! command -v adb >/dev/null 2>&1; then
  echo "adb not found. Install platform-tools or run: source ~/.zshrc"
  exit 1
fi

if [[ -z "${ANDROID_HOME:-}" || ! -d "${ANDROID_HOME}/platforms" ]]; then
  echo "ANDROID_HOME SDK missing. Expected: ~/Library/Android/sdk"
  exit 1
fi

DEVICES="$(adb devices | awk 'NR>1 && $2=="device" {print $1}')"
if [[ -z "$DEVICES" ]]; then
  echo "No adb device. Wireless Honor flow:"
  echo "  1. Phone → Developer options → Wireless debugging → note Debug IP:port"
  echo "  2. adb connect <ip>:<debug-port>"
  echo "  3. adb devices   # must show 'device'"
  exit 1
fi

LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || true)"
if [[ -n "$LAN_IP" ]]; then
  export REACT_NATIVE_PACKAGER_HOSTNAME="$LAN_IP"
fi

echo "Using device(s): $DEVICES"
echo "Metro host: ${REACT_NATIVE_PACKAGER_HOSTNAME:-localhost}"

npx expo run:android --device
