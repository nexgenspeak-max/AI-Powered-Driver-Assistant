#!/usr/bin/env bash
# Check that required services are up before manual/voice e2e.
set -euo pipefail
source "$(dirname "$0")/common.sh"

require_cmd curl

echo ""
echo "── Verify services ──"
info "external-api-service: $TRIP_SERVICE_URL"

curl_ok "$TRIP_SERVICE_URL/health" && pass "external-api-service /health" || fail "external-api-service not running on $TRIP_SERVICE_URL"

if curl_ok "$CALL_LOGGER_URL/health" 2>/dev/null || curl -sf "$CALL_LOGGER_URL/api/v1/records?limit=1" >/dev/null 2>&1; then
  pass "call-records-service reachable ($CALL_LOGGER_URL)"
else
  warn "call-records-service not reachable — summarize_last_call may fail ($CALL_LOGGER_URL)"
fi

if curl_ok "$CALL_CENTER_URL/health" 2>/dev/null; then
  pass "external-channel-service reachable ($CALL_CENTER_URL)"
else
  warn "external-channel-service not reachable — optional; in-room call_customer uses LiveKit SIP ($CALL_CENTER_URL)"
fi

pass "All required checks done (warnings are OK for partial flows)"
