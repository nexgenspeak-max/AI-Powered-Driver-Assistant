#!/bin/bash
# Deploy call-center service to AWS (Lambda + API Gateway via SAM)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_ENV="${1:-dev}"
ENV_FILE="$SCRIPT_DIR/../../src/backend/call-center/envs/.env.$TARGET_ENV"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Env file not found: $ENV_FILE"
  echo "   Usage: ./deploy.sh [dev|prod]"
  exit 1
fi

# Load env vars
export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)

ENVIRONMENT="${ENV:-dev}"
APP_NAME="driver-assistant"
STACK_NAME="${ENVIRONMENT}-${APP_NAME}-call-center"
TEMPLATE="$SCRIPT_DIR/sam.yaml"
S3_BUCKET="${ENVIRONMENT}-${APP_NAME}-sam-artifacts"
REGION="${AWS_REGION:-ap-southeast-1}"
PROFILE="${AWS_PROFILE:+--profile $AWS_PROFILE}"

echo "======================================"
echo " call-center — SAM Deploy"
echo " Environment : $ENVIRONMENT"
echo " Stack       : $STACK_NAME"
echo " Region      : $REGION"
echo "======================================"

# Create S3 bucket for SAM artifacts (ignore if exists)
echo "→ Ensuring S3 artifact bucket..."
aws s3 mb "s3://$S3_BUCKET" --region "$REGION" $PROFILE 2>/dev/null || true

# SAM build
echo "→ Building Lambda package..."
sam build \
  --template "$TEMPLATE" \
  --build-dir "$SCRIPT_DIR/.aws-sam/build" \
  --region "$REGION"

_sam_deploy() {
  local base_url="${1:-}"
  local base_url_param=""
  [[ -n "$base_url" ]] && base_url_param="CallCenterBaseUrl=$base_url"

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
      AppName="$APP_NAME" \
      TwilioAccountSid="$TWILIO_ACCOUNT_SID" \
      TwilioAuthToken="$TWILIO_AUTH_TOKEN" \
      TwilioPhoneNumber="$TWILIO_PHONE_NUMBER" \
      $base_url_param
}

# Step 1: deploy (BASE_URL empty on first run)
echo "→ Deploying to AWS..."
_sam_deploy "${BASE_URL:-}"

# Step 2: fetch the real API GW URL from stack outputs
DEPLOYED_BASE_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  $PROFILE \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text)

# Step 3: if BASE_URL changed, re-deploy so Lambda env var is correct
if [[ "$DEPLOYED_BASE_URL" != "${BASE_URL:-}" ]]; then
  echo "→ Updating BASE_URL → $DEPLOYED_BASE_URL"
  # Persist into .env file so next deploy skips this step
  if grep -q "^BASE_URL=" "$ENV_FILE"; then
    sed -i '' "s|^BASE_URL=.*|BASE_URL=$DEPLOYED_BASE_URL|" "$ENV_FILE"
  else
    echo "BASE_URL=$DEPLOYED_BASE_URL" >> "$ENV_FILE"
  fi
  _sam_deploy "$DEPLOYED_BASE_URL"
fi

# Print webhook URL
echo ""
echo "======================================"
echo "✅ Deployed! Paste this into Twilio Console:"
echo ""
aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  $PROFILE \
  --query "Stacks[0].Outputs[?OutputKey=='InboundWebhookUrl'].OutputValue" \
  --output text
echo "======================================"
