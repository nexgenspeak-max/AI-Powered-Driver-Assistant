#!/usr/bin/env bash
# Build a frontend web app and sync to S3.
#
# Usage:
#   bash infra/frontend/deploy.sh admin-panel dev
#   bash infra/frontend/deploy.sh customer-web dev --bucket my-bucket-name

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$INFRA_DIR/.." && pwd)"

APP="${1:-}"
TARGET_ENV="${2:-dev}"
BUCKET=""

if [[ -z "$APP" ]]; then
  echo "Usage: bash infra/frontend/deploy.sh <admin-panel|customer-web|driver-web> [dev|uat|prod] [--bucket name]" >&2
  exit 1
fi

shift 2 || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --bucket)
      BUCKET="${2:-}"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# shellcheck source=../lib/common.sh
source "$INFRA_DIR/lib/common.sh"

export ENV="$TARGET_ENV"

VALID_APPS=(admin-panel customer-web driver-web)
is_valid=false
for v in "${VALID_APPS[@]}"; do
  [[ "$APP" == "$v" ]] && is_valid=true
done
if [[ "$is_valid" != "true" ]]; then
  echo "❌ Unknown app: $APP" >&2
  exit 1
fi

check_aws_credentials
require_cmd npm

TRIP_URL="$(stack_output "$(stack_name external-api-service "$TARGET_ENV")" "ApiUrl")"
AUTH_URL="$(stack_output "$(stack_name identity-service "$TARGET_ENV")" "ApiUrl")"
LOGGER_URL="$(stack_output "$(stack_name call-records-service "$TARGET_ENV")" "ApiUrl")"

if [[ -z "$TRIP_URL" || "$TRIP_URL" == "None" ]]; then
  echo "❌ external-api-service not deployed." >&2
  exit 1
fi
if [[ -z "$AUTH_URL" || "$AUTH_URL" == "None" ]]; then
  echo "❌ identity-service not deployed." >&2
  exit 1
fi

AUTH_V1="${AUTH_URL%/}/api/v1"

APP_DIR="$REPO_ROOT/src/frontend/$APP"
if [[ ! -d "$APP_DIR" ]]; then
  echo "❌ App directory not found: $APP_DIR" >&2
  exit 1
fi

if [[ -z "$BUCKET" ]]; then
  BUCKET="${TARGET_ENV}-driver-assistant-${APP}"
fi

print_header "Frontend deploy: $APP ($TARGET_ENV)"

cd "$APP_DIR"
export VITE_TRIP_SERVICE_URL="$TRIP_URL"
export VITE_AUTH_SERVICE_URL="$AUTH_V1"
if [[ "$APP" == "admin-panel" && -n "$LOGGER_URL" && "$LOGGER_URL" != "None" ]]; then
  export VITE_CALL_LOGGER_URL="$LOGGER_URL"
fi

npm run build

REGION="${AWS_REGION:-ap-southeast-1}"
PROFILE_ARGS="$(aws_profile_args)"

echo "→ Ensuring S3 bucket s3://$BUCKET ..."
if ! aws s3api head-bucket --bucket "$BUCKET" $PROFILE_ARGS 2>/dev/null; then
  aws s3 mb "s3://$BUCKET" --region "$REGION" $PROFILE_ARGS
fi

aws s3 sync dist/ "s3://$BUCKET/" --delete $PROFILE_ARGS

echo ""
echo "======================================"
echo "✅ $APP → s3://$BUCKET"
echo "   Add CloudFront for HTTPS + SPA routing (see infra/README.md)"
echo "======================================"
