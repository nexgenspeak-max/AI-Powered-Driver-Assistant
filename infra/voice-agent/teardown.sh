#!/bin/bash
# Teardown voice-agent stack from AWS

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_ENV="${1:-dev}"
ENV_FILE="$SCRIPT_DIR/../../src/voice-agent/envs/.env.$TARGET_ENV"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Env file not found: $ENV_FILE"
  echo "   Usage: ./teardown.sh [dev|prod]"
  exit 1
fi

export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)

ENVIRONMENT="${ENV:-dev}"
APP_NAME="driver-assistant"
STACK_NAME="${ENVIRONMENT}-${APP_NAME}-voice-agent"
REGION="${AWS_REGION:-ap-southeast-1}"
PROFILE="${AWS_PROFILE:+--profile $AWS_PROFILE}"

echo "======================================"
echo " voice-agent — Teardown"
echo " Stack  : $STACK_NAME"
echo " Region : $REGION"
echo "======================================"
read -p "⚠️  Delete stack '$STACK_NAME'? (yes/no): " confirm
if [[ "$confirm" != "yes" ]]; then
  echo "Aborted."
  exit 0
fi

# Scale down ECS service to 0 before deleting (avoids stuck deletions)
CLUSTER=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" --region "$REGION" $PROFILE \
  --query "Stacks[0].Outputs[?OutputKey=='ECSClusterName'].OutputValue" \
  --output text 2>/dev/null || echo "")

SERVICE=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" --region "$REGION" $PROFILE \
  --query "Stacks[0].Outputs[?OutputKey=='ECSServiceName'].OutputValue" \
  --output text 2>/dev/null || echo "")

if [[ -n "$CLUSTER" && -n "$SERVICE" ]]; then
  echo "→ Scaling ECS service to 0..."
  aws ecs update-service \
    --cluster "$CLUSTER" --service "$SERVICE" \
    --desired-count 0 --region "$REGION" $PROFILE > /dev/null
fi

# Delete ECR images so the repo can be deleted
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text $PROFILE)
ECR_REPO="${ENVIRONMENT}-${APP_NAME}-voice-agent"
echo "→ Deleting ECR images..."
aws ecr batch-delete-image \
  --repository-name "$ECR_REPO" \
  --region "$REGION" $PROFILE \
  --image-ids "$(aws ecr list-images --repository-name "$ECR_REPO" --region "$REGION" $PROFILE --query 'imageIds[*]' --output json)" \
  > /dev/null 2>&1 || true

echo "→ Deleting CloudFormation stack..."
aws cloudformation delete-stack \
  --stack-name "$STACK_NAME" --region "$REGION" $PROFILE

echo "→ Waiting for deletion..."
aws cloudformation wait stack-delete-complete \
  --stack-name "$STACK_NAME" --region "$REGION" $PROFILE

echo "✅ Stack deleted."
