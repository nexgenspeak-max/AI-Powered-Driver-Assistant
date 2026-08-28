#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_ENV="${1:-dev}"
ENV_FILE="$SCRIPT_DIR/../../src/backend/trip-service/envs/.env.$TARGET_ENV"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Env file not found: $ENV_FILE"
  echo "   Usage: ./deploy.sh [dev|prod]"
  exit 1
fi

export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)

if [[ -z "$JWT_SECRET" ]]; then
  echo "❌ JWT_SECRET is empty in $ENV_FILE — must match auth-service's JWT_SECRET exactly."
  exit 1
fi
if [[ -z "$AUTH_SERVICE_URL" ]]; then
  echo "❌ AUTH_SERVICE_URL is empty in $ENV_FILE — deploy auth-service first and copy its ApiUrl here."
  exit 1
fi

ENVIRONMENT="${ENV:-dev}"
APP_NAME="driver-assistant"
STACK_NAME="${ENVIRONMENT}-${APP_NAME}-trip-service"
TEMPLATE="$SCRIPT_DIR/sam.yaml"
S3_BUCKET="${ENVIRONMENT}-${APP_NAME}-sam-artifacts"
REGION="${AWS_REGION:-ap-southeast-1}"
PROFILE="${AWS_PROFILE:+--profile $AWS_PROFILE}"

echo "======================================"
echo " trip-service — SAM Deploy"
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
# SAM CLI's shorthand --parameter-overrides rejects "Key=" with an empty value,
# so optional params are only included when set (falls back to the template's own Default).
PARAM_OVERRIDES=(Environment="$ENVIRONMENT" AppName="$APP_NAME" JwtSecret="$JWT_SECRET" AuthServiceUrl="$AUTH_SERVICE_URL")
[[ -n "$LIVEKIT_URL" ]] && PARAM_OVERRIDES+=(LivekitUrl="$LIVEKIT_URL")
[[ -n "$LIVEKIT_API_KEY" ]] && PARAM_OVERRIDES+=(LivekitApiKey="$LIVEKIT_API_KEY")
[[ -n "$LIVEKIT_API_SECRET" ]] && PARAM_OVERRIDES+=(LivekitApiSecret="$LIVEKIT_API_SECRET")
[[ -n "$SIP_TRUNK_ID" ]] && PARAM_OVERRIDES+=(SipTrunkId="$SIP_TRUNK_ID")
[[ -n "$GOOGLE_MAPS_API_KEY" ]] && PARAM_OVERRIDES+=(GoogleMapsApiKey="$GOOGLE_MAPS_API_KEY")
[[ -n "$VOICE_AGENT_URL" ]] && PARAM_OVERRIDES+=(VoiceAgentUrl="$VOICE_AGENT_URL")

sam deploy \
  --template-file "$SCRIPT_DIR/.aws-sam/build/template.yaml" \
  --stack-name "$STACK_NAME" \
  --s3-bucket "$S3_BUCKET" \
  --region "$REGION" \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset \
  $PROFILE \
  --parameter-overrides "${PARAM_OVERRIDES[@]}"

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
echo "Copy into src/backend/voice-agent/envs/.env.dev:"
echo "TRIP_SERVICE_URL=$API_URL"
echo "======================================"
