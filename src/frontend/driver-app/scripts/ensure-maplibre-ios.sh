#!/usr/bin/env bash
# Ensure MapLibre.xcframework is present for Xcode SPM before building.
set -euo pipefail

IOS_DIR="$(cd "$(dirname "$0")/../ios" && pwd)"
WORKSPACE="$IOS_DIR/driverapp.xcworkspace"
SCHEME="driverapp"

xcodebuild -resolvePackageDependencies -workspace "$WORKSPACE" -scheme "$SCHEME" >/dev/null 2>&1 || true

DD="$(ls -dt ~/Library/Developer/Xcode/DerivedData/driverapp-* 2>/dev/null | head -1)"
[[ -n "$DD" ]] || { echo "error: no DerivedData for driverapp" >&2; exit 1; }

CHECKOUT="$DD/SourcePackages/checkouts/maplibre-gl-native-distribution"
ARTIFACT_DIR="$DD/SourcePackages/artifacts/maplibre-gl-native-distribution/MapLibre"
XCFW="$ARTIFACT_DIR/MapLibre.xcframework"
STATE="$DD/SourcePackages/workspace-state.json"

if [[ ! -d "$XCFW" ]]; then
  echo "→ Fetching MapLibre via swift package resolve..."
  [[ -d "$CHECKOUT" ]] || { echo "error: checkout missing at $CHECKOUT — run xcodebuild -resolvePackageDependencies" >&2; exit 1; }
  (cd "$CHECKOUT" && swift package resolve >/dev/null)
  SRC="$CHECKOUT/.build/artifacts/maplibre-gl-native-distribution/MapLibre/MapLibre.xcframework"
  [[ -d "$SRC" ]] || { echo "error: MapLibre not in swift cache at $SRC" >&2; exit 1; }
  mkdir -p "$ARTIFACT_DIR"
  cp -R "$SRC" "$ARTIFACT_DIR/"
fi

[[ -d "$XCFW" ]] || { echo "error: MapLibre.xcframework still missing at $XCFW" >&2; exit 1; }

python3 - "$STATE" "$XCFW" <<'PY'
import json, sys
path, xcfw = sys.argv[1], sys.argv[2]
with open(path) as f:
    state = json.load(f)
entry = {
    "kind": {"xcframework": {}},
    "packageRef": {
        "identity": "maplibre-gl-native-distribution",
        "kind": "remoteSourceControl",
        "location": "https://github.com/maplibre/maplibre-gl-native-distribution",
        "name": "MapLibre Native",
    },
    "path": xcfw,
    "source": {
        "checksum": "7c1ec8f099ab3569363e9890dd0b26a9ff5a2d4004dfe8ad8304b22a337bf3e2",
        "type": "remote",
        "url": "https://github.com/maplibre/maplibre-native/releases/download/ios-v6.26.0/MapLibre.dynamic.xcframework.zip",
    },
    "targetName": "MapLibre",
}
arts = [a for a in state["object"].get("artifacts", []) if a.get("targetName") != "MapLibre"]
arts.append(entry)
state["object"]["artifacts"] = arts
with open(path, "w") as f:
    json.dump(state, f, indent=2)
    f.write("\n")
PY

echo "→ MapLibre.xcframework ready"
