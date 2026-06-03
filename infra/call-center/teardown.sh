#!/bin/bash
# Teardown call-center stack from AWS (saves cost when not in use)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_ENV="${1:-dev}"
ENV_FILE="$SCRIPT_DIR/../../src/call-center/envs/.env.$TARGET_ENV"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Env file not found: $ENV_FILE"
  echo "   Usage: ./teardown.sh [dev|prod]"
  exit 1
fi

export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)

ENVIRONMENT="${ENV:-dev}"
APP_NAME="driver-assistant"
STACK_NAME="${ENVIRONMENT}-${APP_NAME}-call-center"
REGION="${AWS_REGION:-ap-southeast-1}"
PROFILE="${AWS_PROFILE:+--profile $AWS_PROFILE}"

echo "======================================"
echo " call-center — Teardown"
echo " Stack  : $STACK_NAME"
echo " Region : $REGION"
echo "======================================"
read -p "⚠️  Delete stack '$STACK_NAME'? (yes/no): " confirm
if [[ "$confirm" != "yes" ]]; then
  echo "Aborted."
  exit 0
fi

aws cloudformation delete-stack \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  $PROFILE

echo "→ Waiting for deletion..."
aws cloudformation wait stack-delete-complete \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  $PROFILE

echo "✅ Stack deleted."
