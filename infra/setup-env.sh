#!/usr/bin/env bash
# Create envs/.env.dev from infra/templates/ and optionally seed from .env.local.
#
# Usage:
#   bash infra/setup-env.sh dev
#   bash infra/setup-env.sh dev --from-local

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET_ENV="${1:-dev}"
FROM_LOCAL=false

if [[ "${2:-}" == "--from-local" ]]; then
  FROM_LOCAL=true
fi

# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

print_header "Setup env files ($TARGET_ENV)"

copy_template() {
  local service="$1"
  local rel="src/backend/${service}/envs/.env.${TARGET_ENV}"
  local dest="$REPO_ROOT/$rel"
  local template="$SCRIPT_DIR/templates/${service}.env.${TARGET_ENV}"

  mkdir -p "$(dirname "$dest")"

  if [[ -f "$dest" ]]; then
    echo "⏭  Skip (exists): $rel"
    return
  fi

  if [[ ! -f "$template" ]]; then
    echo "⚠️  No template: $template"
    return
  fi

  cp "$template" "$dest"
  echo "✅ Created: $rel"
}

for svc in identity-service external-api-service call-records-service external-channel-service llm-orchestrator ops-service; do
  copy_template "$svc"
done

# Shared JWT — generate once if all three are empty
JWT_FILE="$REPO_ROOT/src/backend/identity-service/envs/.env.${TARGET_ENV}"
if [[ -f "$JWT_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$JWT_FILE"
  if [[ -z "${JWT_SECRET:-}" ]]; then
    NEW_JWT="$(openssl rand -hex 32)"
    for svc in identity-service external-api-service external-channel-service call-records-service llm-orchestrator ops-service; do
      set_env_var "$REPO_ROOT/src/backend/${svc}/envs/.env.${TARGET_ENV}" "JWT_SECRET" "$NEW_JWT"
    done
    echo "✅ Generated JWT_SECRET (same value in every service that issues or verifies JWT)"
  fi
fi

if [[ "$FROM_LOCAL" == "true" ]]; then
  echo ""
  echo "→ Copying API keys from .env.local where present..."

  copy_if_local() {
    local service="$1"
    local dest="$REPO_ROOT/src/backend/${service}/envs/.env.${TARGET_ENV}"
    local local_file="$REPO_ROOT/src/backend/${service}/envs/.env.local"
    [[ -f "$local_file" ]] || return 0
    [[ -f "$dest" ]] || return 0

    while IFS= read -r line || [[ -n "$line" ]]; do
      [[ "$line" =~ ^# ]] && continue
      [[ "$line" =~ ^[A-Z_]+=.+ ]] || continue
      key="${line%%=*}"
      val="${line#*=}"
      case "$key" in
        ENV|AWS_REGION|AWS_PROFILE|JWT_SECRET|IDENTITY_SERVICE_URL|EXTERNAL_API_SERVICE_URL|EXTERNAL_CHANNEL_SERVICE_URL|CALL_RECORDS_SERVICE_URL|AUTH_SERVICE_URL|TRIP_SERVICE_URL|CALL_CENTER_URL|CALL_LOGGER_URL|BASE_URL|VPC_ID|SUBNET_IDS)
          continue
          ;;
      esac
      [[ -n "$val" ]] && set_env_var "$dest" "$key" "$val"
    done <"$local_file"
    echo "   merged keys → src/backend/${service}/envs/.env.${TARGET_ENV}"
  }

  for svc in identity-service external-api-service call-records-service external-channel-service llm-orchestrator ops-service; do
    copy_if_local "$svc"
  done
fi

# Auto-fill VPC for llm-orchestrator if empty
VA_ENV="$REPO_ROOT/src/backend/llm-orchestrator/envs/.env.${TARGET_ENV}"
if [[ -f "$VA_ENV" ]]; then
  # shellcheck disable=SC1090
  source "$VA_ENV"
  if [[ -z "${VPC_ID:-}" || -z "${SUBNET_IDS:-}" ]]; then
    if aws sts get-caller-identity $(aws_profile_args) >/dev/null 2>&1; then
      VPC="$(discover_default_vpc)"
      if [[ -n "$VPC" && "$VPC" != "None" ]]; then
        SUBNETS="$(discover_public_subnets "$VPC")"
        set_env_var "$VA_ENV" "VPC_ID" "$VPC"
        set_env_var "$VA_ENV" "SUBNET_IDS" "$SUBNETS"
        echo "✅ llm-orchestrator: VPC_ID=$VPC SUBNET_IDS=$SUBNETS"
      fi
    else
      echo "ℹ️  AWS not configured — fill VPC_ID and SUBNET_IDS in llm-orchestrator env manually"
    fi
  fi
fi

echo ""
echo "======================================"
echo "Next steps:"
echo "  1. Review env files under src/backend/*/envs/.env.${TARGET_ENV}"
echo "  2. Fill missing API keys (LiveKit, OpenAI, Twilio...)"
echo "  3. bash infra/status.sh ${TARGET_ENV}     # see what's already deployed"
echo "  4. bash infra/deploy-all.sh ${TARGET_ENV} # deploy full stack"
echo "======================================"
