#!/bin/bash
# Teardown call-logger stack (DynamoDB table is RETAINED — data is not deleted)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_ENV="${1:-dev}"
ENV_FILE="$SCRIPT_DIR/../../src/call-logger/envs/.env.$TARGET_ENV"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Env file not found: $ENV_FILE"
  echo "   Usage: ./teardown.sh [dev|prod]"
  exit 1
fi

export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)

ENVIRONMENT="${ENV:-dev}"
APP_NAME="driver-assistant"
STACK_NAME="${ENVIRONMENT}-${APP_NAME}-call-logger"
REGION="${AWS_REGION:-ap-southeast-1}"
PROFILE="${AWS_PROFILE:+--profile $AWS_PROFILE}"

echo "======================================"
echo " call-logger — Teardown"
echo " Stack  : $STACK_NAME"
echo " Region : $REGION"
echo "======================================"
echo "⚠️  Note: DynamoDB table is RETAINED (data is safe)."
read -p "Delete Lambda + API Gateway? (yes/no): " confirm
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

echo "✅ Stack deleted. DynamoDB table preserved."
