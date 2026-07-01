#!/bin/bash
# Deploy call-logger to AWS (Lambda + API Gateway + DynamoDB via SAM)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_ENV="${1:-dev}"
ENV_FILE="$SCRIPT_DIR/../../src/backend/call-logger/envs/.env.$TARGET_ENV"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Env file not found: $ENV_FILE"
  echo "   Usage: ./deploy.sh [dev|prod]"
  exit 1
fi

export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)

ENVIRONMENT="${ENV:-dev}"
APP_NAME="driver-assistant"
STACK_NAME="${ENVIRONMENT}-${APP_NAME}-call-logger"
TEMPLATE="$SCRIPT_DIR/sam.yaml"
S3_BUCKET="${ENVIRONMENT}-${APP_NAME}-sam-artifacts"
REGION="${AWS_REGION:-ap-southeast-1}"
PROFILE="${AWS_PROFILE:+--profile $AWS_PROFILE}"

echo "======================================"
echo " call-logger — SAM Deploy"
echo " Environment : $ENVIRONMENT"
echo " Stack       : $STACK_NAME"
echo " Region      : $REGION"
echo "======================================"

echo "→ Ensuring S3 artifact bucket..."
aws s3 mb "s3://$S3_BUCKET" --region "$REGION" $PROFILE 2>/dev/null || true

echo "→ Building Lambda package..."
sam build \
  --template "$TEMPLATE" \
  --build-dir "$SCRIPT_DIR/.aws-sam/build" \
  --region "$REGION"

echo "→ Deploying to AWS..."
sam deploy \
  --template-file "$SCRIPT_DIR/.aws-sam/build/template.yaml" \
  --stack-name "$STACK_NAME" \
  --s3-bucket "$S3_BUCKET" \
  --region "$REGION" \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset \
  $PROFILE \
  --parameter-overrides \
    Environment="$ENVIRONMENT" \
    AppName="$APP_NAME"

# Print the API URL — paste into voice-agent .env.dev as CALL_LOGGER_URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  $PROFILE \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text)

echo ""
echo "======================================"
echo "✅ Deployed!"
echo ""
echo "Copy this into src/voice-agent/envs/.env.dev:"
echo "CALL_LOGGER_URL=$API_URL"
echo "======================================"
