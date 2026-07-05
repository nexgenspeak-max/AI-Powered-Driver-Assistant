#!/usr/bin/env bash
# Verify GET /drivers/me/context — same payload voice-agent prefetch uses.
set -euo pipefail
source "$(dirname "$0")/common.sh"

require_cmd curl
require_cmd python3

FRESH="${1:-false}"

echo ""
echo "── Driver context (prefetch) ──"
info "GET $TRIP_SERVICE_URL/api/v1/drivers/me/context  X-Driver-Phone: $DRIVER_HEADER"

URL="$TRIP_SERVICE_URL/api/v1/drivers/me/context"
[[ "$FRESH" == "true" ]] && URL="${URL}?fresh=true"

curl -sf "$URL" -H "X-Driver-Phone: $DRIVER_HEADER" | python3 -c "
import json, sys
ctx = json.load(sys.stdin)
upcoming = ctx.get('upcoming_trips') or []
current = ctx.get('current_trip')
earnings = ctx.get('today_earnings') or {}
bonuses = ctx.get('active_bonuses') or []
print(f'  upcoming_trips: {len(upcoming)}')
print(f\"  current_trip:   {'yes — ' + current.get('trip_id', '') if current else 'none'}\")
print(f\"  today_earnings: {earnings.get('total_earnings', 'n/a')}\")
print(f'  active_bonuses: {len(bonuses)}')
print(f\"  driver.status:  {(ctx.get('driver') or {}).get('status', 'n/a')}\")
if not upcoming and not current:
    sys.exit(1)
"

pass "Driver context OK — voice-agent prefetch should succeed"
