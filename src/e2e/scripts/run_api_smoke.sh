#!/usr/bin/env bash
# API-level e2e smoke: services up → seed trip → check prefetch → status flow.
set -euo pipefail

DIR="$(dirname "$0")"

echo ""
echo "══════════════════════════════════════"
echo "  Driver Assistant — API E2E Smoke"
echo "══════════════════════════════════════"

bash "$DIR/verify_services.sh"
TRIP_ID=$(bash "$DIR/seed_trip.sh" confirmed)
bash "$DIR/check_driver_context.sh"
bash "$DIR/test_trip_status.sh" "$TRIP_ID"

echo ""
echo -e "\033[32m✓ API smoke passed\033[0m"
echo "  Next: start voice-agent + agents-playground for voice scenarios (see README.md)"
