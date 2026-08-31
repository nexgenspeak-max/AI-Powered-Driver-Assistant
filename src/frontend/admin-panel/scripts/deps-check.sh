#!/usr/bin/env bash
# Quick check that admin-panel backends are reachable. Run: npm run verify:deps
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AUTH_URL="${VITE_AUTH_SERVICE_URL:-http://localhost:8003}"
TRIP_URL="${VITE_TRIP_SERVICE_URL:-http://localhost:8002}"

fail() { echo "deps-check FAIL: $1" >&2; exit 1; }

auth_health="${AUTH_URL%/api/v1}/health"
trip_health="${TRIP_URL}/health"

code_auth=$(curl -s -o /dev/null -w '%{http_code}' "$auth_health" 2>/dev/null || echo 000)
code_trip=$(curl -s -o /dev/null -w '%{http_code}' "$trip_health" 2>/dev/null || echo 000)

if [[ "$code_auth" != "200" ]]; then
  fail "auth-service not reachable at $auth_health (got $code_auth) — run: cd src/backend/auth-service && npm run dev"
fi
if [[ "$code_trip" != "200" ]]; then
  fail "trip-service not reachable at $trip_health (got $code_trip) — run: cd src/backend/trip-service && npm run dev"
fi

echo "deps-check ok auth=$auth_health trip=$trip_health"
