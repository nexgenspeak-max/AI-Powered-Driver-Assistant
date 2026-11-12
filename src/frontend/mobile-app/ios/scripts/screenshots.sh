#!/usr/bin/env bash
# Demo-mode screenshots of every main screen, dark and light.
# Usage: scripts/screenshots.sh <simulator-udid> <out-dir> [screen-filter]
set -euo pipefail
export DEVELOPER_DIR=${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}
UDID=$1
OUT=$2
FILTER=${3:-}
BUNDLE=com.chinhtruongba.driverapp
mkdir -p "$OUT"

xcrun simctl privacy "$UDID" grant microphone "$BUNDLE" >/dev/null 2>&1 || true
xcrun simctl status_bar "$UDID" override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3 >/dev/null 2>&1 || true

# name | wait seconds | launch args
SCREENS=(
  "landing|3|-signedOut"
  "login|3|-signedOut -authScreen login"
  "register|3|-signedOut -authScreen register"
  "home-map|9|"
  "home-navigation|10|-navigate"
  "trips-pending|4|-startTab trips -tripsSegment pending"
  "trips-active|4|-startTab trips"
  "trips-done|4|-startTab trips -tripsSegment done"
  "add-trip|4|-route add-trip"
  "offer-sheet|5|-startTab trips -showOffer"
  "chat-connected|13|-openChat -connectVoice"
  "earnings|5|-startTab earnings"
  "profile|4|-startTab profile"
  "assistant-settings|4|-route assistant-settings"
  "faq|3|-route faq"
)

for theme in dark light; do
  xcrun simctl ui "$UDID" appearance "$theme" >/dev/null 2>&1 || true
  for entry in "${SCREENS[@]}"; do
    IFS='|' read -r name wait args <<<"$entry"
    if [[ -n "$FILTER" && "$name" != *"$FILTER"* ]]; then continue; fi
    xcrun simctl terminate "$UDID" "$BUNDLE" >/dev/null 2>&1 || true
    # shellcheck disable=SC2086
    xcrun simctl launch "$UDID" "$BUNDLE" -demo -theme "$theme" $args >/dev/null
    sleep "$wait"
    xcrun simctl io "$UDID" screenshot --type=png "$OUT/$name-iphone17pro-$theme.png" >/dev/null 2>&1
    echo "captured $name ($theme)"
  done
done
xcrun simctl terminate "$UDID" "$BUNDLE" >/dev/null 2>&1 || true
