#!/usr/bin/env bash
# Deploy the full backend in dependency order, copying service URLs between env files.
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

# Copy each deployed service URL into the env files of the services that call it.
propagate_urls() {
  local out
  set_url() { # <from-service> <output-key> <VAR> <to-service...>
    local from="$1" key="$2" var="$3"; shift 3
    out="$(stack_output "$(stack_name "$from" "$TARGET_ENV")" "$key")"
    [[ -n "$out" && "$out" != "None" ]] || return 0
    for to in "$@"; do
      local f="$REPO_ROOT/src/backend/${to}/envs/.env.${TARGET_ENV}"
      [[ -f "$f" ]] && set_env_var "$f" "$var" "$out" && echo "✅ ${to} ← ${var}"
    done
  }
  set_url identity-service IdentityApiUrl IDENTITY_SERVICE_URL external-api-service
  set_url call-records-service CallRecordsApiUrl CALL_RECORDS_SERVICE_URL external-api-service llm-orchestrator
  set_url external-channel-service ExternalChannelApiUrl EXTERNAL_CHANNEL_SERVICE_URL external-api-service
  set_url external-api-service ExternalApiUrl EXTERNAL_API_SERVICE_URL llm-orchestrator
}

print_header "Deploy all backend ($TARGET_ENV)"

# Validate env files exist
MISSING_ENV=()
for svc in identity-service call-records-service external-channel-service external-api-service llm-orchestrator ops-service; do
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

# Dependency order: each service is deployed after the services it calls.
for svc in identity-service call-records-service external-channel-service external-api-service llm-orchestrator ops-service; do
  run_deploy "$svc"
  propagate_urls
done

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
