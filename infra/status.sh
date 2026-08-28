#!/usr/bin/env bash
# Show CloudFormation stack status + monthly idle cost estimate.
#
# Usage: bash infra/status.sh [dev|uat|prod]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_ENV="${1:-dev}"

# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

export ENV="$TARGET_ENV"
REGION="${AWS_REGION:-ap-southeast-1}"

print_header "Stack status ($TARGET_ENV)"

if ! aws sts get-caller-identity $(aws_profile_args) >/dev/null 2>&1; then
  echo "⚠️  AWS not configured — cannot query stacks."
  exit 0
fi

SERVICES=(auth-service trip-service call-logger call-center voice-agent)
DEPLOYED=0
MISSING=0

printf "%-20s %-45s %s\n" "SERVICE" "STACK" "STATUS"
printf "%-20s %-45s %s\n" "-------" "-----" "------"

for svc in "${SERVICES[@]}"; do
  name="$(stack_name "$svc" "$TARGET_ENV")"
  if stack_exists "$name"; then
    status="$(aws cloudformation describe-stacks \
      --stack-name "$name" \
      --region "$REGION" \
      $(aws_profile_args) \
      --query 'Stacks[0].StackStatus' \
      --output text)"
    printf "%-20s %-45s %s\n" "$svc" "$name" "$status"
    DEPLOYED=$((DEPLOYED + 1))

    if [[ "$svc" == "auth-service" || "$svc" == "trip-service" || "$svc" == "call-logger" ]]; then
      url="$(stack_output "$name" "ApiUrl")"
      [[ -n "$url" && "$url" != "None" ]] && echo "                     → ApiUrl: $url"
    fi
    if [[ "$svc" == "voice-agent" ]]; then
      url="$(stack_output "$name" "VoiceAgentApiUrl")"
      [[ -n "$url" && "$url" != "None" ]] && echo "                     → VoiceAgentApiUrl: $url"
    fi
  else
    printf "%-20s %-45s %s\n" "$svc" "$name" "NOT DEPLOYED"
    MISSING=$((MISSING + 1))
  fi
done

echo ""
echo "Deployed: $DEPLOYED / ${#SERVICES[@]}   Missing: $MISSING"
echo ""

# ECS desired count (voice-agent cost driver)
VA_STACK="$(stack_name voice-agent "$TARGET_ENV")"
if stack_exists "$VA_STACK"; then
  CLUSTER="$(stack_output "$VA_STACK" "ECSClusterName")"
  SERVICE="$(stack_output "$VA_STACK" "ECSServiceName")"
  if [[ -n "$CLUSTER" && "$CLUSTER" != "None" ]]; then
    DESIRED="$(aws ecs describe-services \
      --cluster "$CLUSTER" \
      --services "$SERVICE" \
      --region "$REGION" \
      $(aws_profile_args) \
      --query 'services[0].desiredCount' \
      --output text 2>/dev/null || echo "?")"
    echo "voice-agent ECS desiredCount: $DESIRED"
    if [[ "$DESIRED" == "0" ]]; then
      echo "   💡 ECS is scaled to 0 — saving ~\$41/month (ALB still ~\$18-20 if stack exists)"
    fi
  fi
fi

echo ""
echo "Estimated idle AWS cost (0 calls/day, this env):"
if [[ "$DEPLOYED" -eq 0 ]]; then
  echo "  \$0/month (nothing deployed)"
elif [[ "$DEPLOYED" -lt 5 ]]; then
  echo "  ~\$5-20/month (partial stack — mostly Lambda free tier)"
else
  echo "  ~\$61-66/month (full stack 24/7)"
  echo "  ~\$20-25/month (ECS scaled to 0, ALB still running)"
fi
echo ""
echo "Scale ECS: bash infra/scale-ecs.sh $TARGET_ENV [0|1]"
