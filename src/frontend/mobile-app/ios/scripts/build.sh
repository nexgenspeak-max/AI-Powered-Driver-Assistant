#!/usr/bin/env bash
# Build app + tests for the simulator and install on the given UDID.
set -euo pipefail
cd "$(dirname "$0")/.."
export DEVELOPER_DIR=${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}
xcodebuild -project CzenDriver.xcodeproj -scheme CzenDriver -destination "platform=iOS Simulator,name=${SIM_NAME:-Czen Native iOS}" \
  -derivedDataPath build/DerivedData -clonedSourcePackagesDirPath build/SourcePackages build-for-testing > build/build.log 2>&1 || { grep -E "error:" build/build.log | sort -u | head -30; exit 1; }
grep -E "\.swift:[0-9]+:[0-9]+: (error|warning):" build/build.log | grep -v SourcePackages | sort -u || true
if [[ -n "${1:-}" ]]; then xcrun simctl install "$1" build/DerivedData/Build/Products/Debug-iphonesimulator/CzenDriver.app; fi
echo "build ok"
