#!/usr/bin/env bash
# Teardown backend stacks in reverse dependency order.
#
# Usage:
#   bash infra/teardown-all.sh dev
#   bash infra/teardown-all.sh dev --yes   # skip confirmation prompts

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_ENV="${1:-dev}"
AUTO_YES=false
[[ "${2:-}" == "--yes" ]] && AUTO_YES=true

# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

export ENV="$TARGET_ENV"

confirm() {
  local msg="$1"
  if [[ "$AUTO_YES" == "true" ]]; then
    return 0
  fi
  read -r -p "$msg (yes/no): " ans
  [[ "$ans" == "yes" ]]
}

print_header "Teardown all ($TARGET_ENV)"
echo "Order: llm-orchestrator → external-channel-service → call-records-service → external-api-service → identity-service"
echo ""

if ! confirm "⚠️  Delete ALL stacks for environment '$TARGET_ENV'?"; then
  echo "Aborted."
  exit 0
fi

run_teardown() {
  local svc="$1"
  local script="$SCRIPT_DIR/${svc}/teardown.sh"
  if [[ ! -f "$script" ]]; then
    echo "⏭  No teardown script: $svc"
    return 0
  fi
  local stack
  stack="$(stack_name "$svc" "$TARGET_ENV")"
  if ! stack_exists "$stack"; then
    echo "⏭  Not deployed: $stack"
    return 0
  fi
  echo ""
  echo "→ Teardown $svc ($stack)"
  if [[ "$AUTO_YES" == "true" ]]; then
    TEARDOWN_AUTO_YES=1 bash "$script" "$TARGET_ENV"
  else
    bash "$script" "$TARGET_ENV"
  fi
}

# Reverse order
for svc in llm-orchestrator external-channel-service call-records-service external-api-service identity-service; do
  run_teardown "$svc"
done

echo ""
echo "✅ Teardown complete. DynamoDB tables are RETAINED (data preserved)."
bash "$SCRIPT_DIR/status.sh" "$TARGET_ENV"
