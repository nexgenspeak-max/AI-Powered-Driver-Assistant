#!/usr/bin/env bash
# Build, sign, and install driver-app on a connected iPhone.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="$ROOT/ios"
SCHEME="driverapp"
WORKSPACE="$IOS_DIR/driverapp.xcworkspace"
CONFIGURATION="${CONFIGURATION:-Debug}"
DEVICE="${1:-00008030-000178683C09802E}"

LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
if [[ -n "$LAN_IP" ]]; then
  export REACT_NATIVE_PACKAGER_HOSTNAME="$LAN_IP"
  echo "Metro host for device build: $REACT_NATIVE_PACKAGER_HOSTNAME"
  echo "Start Metro in another terminal: cd $(dirname "$0")/.. && REACT_NATIVE_PACKAGER_HOSTNAME=$LAN_IP npx expo start --lan"
fi

bash "$ROOT/scripts/ensure-maplibre-ios.sh"

cd "$IOS_DIR"
echo "→ Building for iOS (signed)..."
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration "$CONFIGURATION" \
  -destination 'generic/platform=iOS' \
  -allowProvisioningUpdates \
  build

DD="$(ls -dt ~/Library/Developer/Xcode/DerivedData/driverapp-* | head -1)"
APP="$DD/Build/Products/${CONFIGURATION}-iphoneos/driverapp.app"
[[ -d "$APP" ]] || { echo "error: $APP not found" >&2; exit 1; }

echo "→ Installing on device..."
xcrun devicectl device install app --device "$DEVICE" "$APP"
echo "✓ Done — open driver-app on iPhone (trust dev cert first time if prompted)"
