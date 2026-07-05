#!/usr/bin/env bash
# Test trip status mutation + context update path (API level, no voice).
set -euo pipefail
source "$(dirname "$0")/common.sh"

require_cmd curl

TRIP_ID="${1:-}"
if [[ -z "$TRIP_ID" && -f "$E2E_ROOT/.last_trip_id" ]]; then
  TRIP_ID=$(cat "$E2E_ROOT/.last_trip_id")
fi
[[ -n "$TRIP_ID" ]] || fail "Usage: $0 [trip_id]  (or run seed_trip.sh first)"

echo ""
echo "── Trip status mutations (trip_id=$TRIP_ID) ──"

for STATUS in ARRIVED_PICKUP PICKED_UP COMPLETED; do
  curl -sf -X PATCH "$TRIP_SERVICE_URL/api/v1/trips/$TRIP_ID" \
    -H "Content-Type: application/json" \
    -d "{\"status\": \"$STATUS\"}" >/dev/null
  pass "PATCH → $STATUS"
done

# Fresh context after mutations
bash "$(dirname "$0")/check_driver_context.sh" true || warn "No active trip after COMPLETED (expected)"

pass "Status mutation API flow OK"
