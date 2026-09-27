#!/usr/bin/env bash
# Scale llm-orchestrator ECS service up/down to control idle cost.
#
# Usage:
#   bash infra/scale-ecs.sh dev 0   # stop worker
#   bash infra/scale-ecs.sh dev 1   # start

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_ENV="${1:-dev}"
COUNT="${2:-}"

# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

export ENV="$TARGET_ENV"
REGION="${AWS_REGION:-ap-southeast-1}"

if [[ -z "$COUNT" ]]; then
  echo "Usage: bash infra/scale-ecs.sh [dev|uat|prod] [0|1]" >&2
  exit 1
fi

check_aws_credentials

VA_STACK="$(stack_name llm-orchestrator "$TARGET_ENV")"
if ! stack_exists "$VA_STACK"; then
  echo "❌ llm-orchestrator stack not deployed: $VA_STACK" >&2
  exit 1
fi

CLUSTER="$(stack_output "$VA_STACK" "LlmOrchestratorClusterName")"
WORKER="$(stack_output "$VA_STACK" "LlmOrchestratorServiceName")"

echo "→ $WORKER desiredCount=$COUNT"
aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$WORKER" \
  --desired-count "$COUNT" \
  --region "$REGION" \
  $(aws_profile_args) \
  >/dev/null

if [[ "$COUNT" == "0" ]]; then
  echo "✅ ECS scaled to 0."
  echo "   bash infra/llm-orchestrator/teardown.sh $TARGET_ENV"
else
  echo "✅ ECS scaled to 1. Wait ~30s then check logs:"
  echo "   aws logs tail /ecs/${TARGET_ENV}-driver-assistant-llm-orchestrator --follow $(aws_profile_args)"
fi
