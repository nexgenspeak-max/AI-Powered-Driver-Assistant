#!/usr/bin/env bash
# Seeds local.properties from the RN app's .env without printing any value.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
env_file="${1:-$here/../../driver-app/.env}"
out="$here/local.properties"
[ -f "$env_file" ] || { echo "missing $env_file" >&2; exit 1; }
read_key() { grep -E "^$1=" "$env_file" | tail -1 | cut -d= -f2- | sed -E 's/^"(.*)"$/\1/; s/^'"'"'(.*)'"'"'$/\1/'; }
trip="$(read_key EXPO_PUBLIC_TRIP_SERVICE_URL || true)"
auth="$(read_key EXPO_PUBLIC_AUTH_SERVICE_URL || true)"
goong="$(read_key EXPO_PUBLIC_GOONG_MAPS_KEY || true)"
{
  echo "sdk.dir=${ANDROID_HOME:-$HOME/Library/Android/sdk}"
  echo "czen.tripServiceUrl=${trip}"
  echo "czen.authServiceUrl=${auth}"
  echo "czen.goongMapsKey=${goong}"
} > "$out"
chmod 600 "$out"
echo "wrote $(basename "$out") with keys: sdk.dir czen.tripServiceUrl($([ -n "$trip" ] && echo set || echo empty)) czen.authServiceUrl($([ -n "$auth" ] && echo set || echo empty)) czen.goongMapsKey($([ -n "$goong" ] && echo set || echo empty))"
