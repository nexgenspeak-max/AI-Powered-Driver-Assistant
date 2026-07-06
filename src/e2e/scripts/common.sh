#!/usr/bin/env bash
# Shared config for e2e scripts. Source from other scripts:
#   source "$(dirname "$0")/common.sh"

set -euo pipefail

E2E_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Keep explicit CLI overrides (CUSTOMER_PHONE=x ./seed_trip.sh)
_CLI_CUSTOMER_PHONE="${CUSTOMER_PHONE-}"
_CLI_DRIVER_PHONE="${DRIVER_PHONE-}"
_CLI_TRIP_SERVICE_URL="${TRIP_SERVICE_URL-}"

if [[ -f "$E2E_ROOT/.env.local" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "$E2E_ROOT/.env.local"
  set +a
fi

[[ -n "$_CLI_TRIP_SERVICE_URL" ]] && TRIP_SERVICE_URL="$_CLI_TRIP_SERVICE_URL"
[[ -n "$_CLI_DRIVER_PHONE" ]] && DRIVER_PHONE="$_CLI_DRIVER_PHONE"
[[ -n "$_CLI_CUSTOMER_PHONE" ]] && CUSTOMER_PHONE="$_CLI_CUSTOMER_PHONE"

TRIP_SERVICE_URL="${TRIP_SERVICE_URL:-http://localhost:8002}"
CALL_CENTER_URL="${CALL_CENTER_URL:-http://localhost:8000}"
CALL_LOGGER_URL="${CALL_LOGGER_URL:-http://localhost:8001}"
DRIVER_PHONE="${DRIVER_PHONE:-84867347452}"
CUSTOMER_PHONE="${CUSTOMER_PHONE:-84901234567}"

DRIVER_HEADER="$DRIVER_PHONE"
if [[ "$DRIVER_PHONE" != +* ]]; then
  DRIVER_HEADER="+${DRIVER_PHONE#+}"
fi

GREEN='\033[32m'
RED='\033[31m'
YELLOW='\033[33m'
RESET='\033[0m'

pass() { echo -e "  ${GREEN}✓${RESET}  $*" >&2; }
fail() { echo -e "  ${RED}✗${RESET}  $*" >&2; exit 1; }
warn() { echo -e "  ${YELLOW}⚠${RESET}  $*" >&2; }
info() { echo -e "  →  $*" >&2; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing command: $1"
}

curl_ok() {
  local url="$1"
  curl -sf "$url" >/dev/null
}
