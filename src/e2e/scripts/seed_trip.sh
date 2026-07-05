#!/usr/bin/env bash
# Create a test trip assigned to DRIVER_PHONE. Prints trip_id on stdout (last line).
set -euo pipefail
source "$(dirname "$0")/common.sh"

require_cmd curl
require_cmd python3

STATUS="${1:-confirmed}"   # pending | confirmed | notified — use confirmed for active-trip tools

echo ""
echo "── Seed trip (driver=$DRIVER_HEADER status=$STATUS) ──"

BODY=$(python3 - <<PY
import json
print(json.dumps({
    "driver_phone": "$DRIVER_HEADER",
    "customer_name": "Nguyễn Văn Test",
    "customer_phone": "$CUSTOMER_PHONE",
    "pickup_address": "123 Lê Lợi, Quận 1, TP.HCM",
    "dropoff_address": "45 Nguyễn Huệ, Quận 1, TP.HCM",
    "pickup_time": "14:30",
    "booked_via": "e2e",
}))
PY
)

RESP=$(curl -sf -X POST "$TRIP_SERVICE_URL/api/v1/trips" \
  -H "Content-Type: application/json" \
  -d "$BODY")

TRIP_ID=$(python3 -c "import json,sys; print(json.load(sys.stdin)['trip_id'])" <<<"$RESP")
pass "Created trip_id=$TRIP_ID"

if [[ "$STATUS" != "pending" ]]; then
  RESP=$(curl -sf -X PATCH "$TRIP_SERVICE_URL/api/v1/trips/$TRIP_ID" \
    -H "Content-Type: application/json" \
    -d "{\"status\": \"$STATUS\"}")
  pass "Patched status → $STATUS"
fi

# Save for other scripts
echo "$TRIP_ID" > "$E2E_ROOT/.last_trip_id"
info "Saved to $E2E_ROOT/.last_trip_id"

echo "$TRIP_ID"
