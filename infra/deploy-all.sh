#!/usr/bin/env bash
# Deploy full backend stack in dependency order (handles external-api-service 2-pass bootstrap).
#
# Usage:
#   bash infra/deploy-all.sh dev
#   bash infra/deploy-all.sh dev --skip llm-orchestrator,external-channel-service
#   bash infra/deploy-all.sh dev --only identity-service,external-api-service
#   bash infra/deploy-all.sh dev --dry-run
#
# Prerequisites:
#   bash infra/setup-env.sh dev [--from-local]
#   aws configure + sam + docker (for llm-orchestrator)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET_ENV="${1:-dev}"
shift || true

SKIP=""
ONLY=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip)
      SKIP="${2:-}"
      shift 2
      ;;
    --only)
      ONLY="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

export ENV="$TARGET_ENV"

should_run() {
  local svc="$1"
  local x
  if [[ -n "$ONLY" ]]; then
    IFS=',' read -ra _only_list <<< "$ONLY"
    for x in "${_only_list[@]}"; do
      [[ "$x" == "$svc" ]] && return 0
    done
    return 1
  fi
  if [[ -n "$SKIP" ]]; then
    IFS=',' read -ra _skip_list <<< "$SKIP"
    for x in "${_skip_list[@]}"; do
      [[ "$x" == "$svc" ]] && return 1
    done
  fi
  return 0
}

run_deploy() {
  local svc="$1"
  local extra="${2:-false}"
  if ! should_run "$svc"; then
    echo "⏭  Skip: $svc"
    return 0
  fi
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " Deploying: $svc"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "(dry-run) bash $SCRIPT_DIR/${svc}/deploy.sh $TARGET_ENV"
    return 0
  fi
  if [[ "$svc" == "llm-orchestrator" ]]; then
    check_deploy_prereqs true
  else
    check_deploy_prereqs false
  fi
  bash "$SCRIPT_DIR/${svc}/deploy.sh" "$TARGET_ENV"
}

propagate_urls() {
  local auth_stack trip_stack logger_stack
  auth_stack="$(stack_name identity-service "$TARGET_ENV")"
  trip_stack="$(stack_name external-api-service "$TARGET_ENV")"
  logger_stack="$(stack_name call-records-service "$TARGET_ENV")"

  local auth_url trip_url logger_url
  auth_url="$(stack_output "$auth_stack" "ApiUrl")"
  trip_url="$(stack_output "$trip_stack" "ApiUrl")"
  logger_url="$(stack_output "$logger_stack" "ApiUrl")"

  local trip_env="$REPO_ROOT/src/backend/external-api-service/envs/.env.${TARGET_ENV}"
  local voice_env="$REPO_ROOT/src/backend/llm-orchestrator/envs/.env.${TARGET_ENV}"

  if [[ -n "$auth_url" && "$auth_url" != "None" && -f "$trip_env" ]]; then
    set_env_var "$trip_env" "AUTH_SERVICE_URL" "$auth_url"
    echo "✅ external-api-service ← AUTH_SERVICE_URL"
  fi
  if [[ -n "$trip_url" && "$trip_url" != "None" && -f "$voice_env" ]]; then
    set_env_var "$voice_env" "TRIP_SERVICE_URL" "$trip_url"
    echo "✅ llm-orchestrator ← TRIP_SERVICE_URL"
  fi
  if [[ -n "$logger_url" && "$logger_url" != "None" ]]; then
    [[ -f "$voice_env" ]] && set_env_var "$voice_env" "CALL_LOGGER_URL" "$logger_url"
    [[ -f "$trip_env" ]] && set_env_var "$trip_env" "CALL_LOGGER_URL" "$logger_url"
    echo "✅ trip/voice ← CALL_LOGGER_URL"
  fi
}

print_header "Deploy all backend ($TARGET_ENV)"

# Validate env files exist
MISSING_ENV=()
for svc in identity-service external-api-service call-records-service external-channel-service llm-orchestrator; do
  if should_run "$svc"; then
    f="$REPO_ROOT/src/backend/${svc}/envs/.env.${TARGET_ENV}"
    [[ -f "$f" ]] || MISSING_ENV+=("$f")
  fi
done

if [[ ${#MISSING_ENV[@]} -gt 0 ]]; then
  echo "❌ Missing env files. Run first:"
  echo "   bash infra/setup-env.sh $TARGET_ENV --from-local"
  for f in "${MISSING_ENV[@]}"; do
    echo "   - $f"
  done
  exit 1
fi

# Phase 1 — linear DAG
run_deploy identity-service
propagate_urls

run_deploy external-api-service
propagate_urls

run_deploy call-records-service
propagate_urls

run_deploy external-channel-service

run_deploy llm-orchestrator
propagate_urls

echo ""
echo "======================================"
if [[ "$DRY_RUN" == "true" ]]; then
  echo "Dry-run complete."
else
  echo "✅ Deploy-all finished ($TARGET_ENV)"
  echo ""
  bash "$SCRIPT_DIR/status.sh" "$TARGET_ENV"
fi
echo "======================================"
