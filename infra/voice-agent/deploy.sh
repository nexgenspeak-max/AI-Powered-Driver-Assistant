#!/bin/bash
# Deploy voice-agent to AWS (ECR + ECS Fargate via CloudFormation)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_ENV="${1:-dev}"
ENV_FILE="$SCRIPT_DIR/../../src/backend/voice-agent/envs/.env.$TARGET_ENV"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Env file not found: $ENV_FILE"
  echo "   Usage: ./deploy.sh [dev|prod]"
  exit 1
fi

export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)

ENVIRONMENT="${ENV:-dev}"
APP_NAME="driver-assistant"
STACK_NAME="${ENVIRONMENT}-${APP_NAME}-voice-agent"
REGION="${AWS_REGION:-ap-southeast-1}"
PROFILE="${AWS_PROFILE:+--profile $AWS_PROFILE}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text $PROFILE)
ECR_REPO="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ENVIRONMENT}-${APP_NAME}-voice-agent"
IMAGE_URI="${ECR_REPO}:latest"

echo "======================================"
echo " voice-agent — Deploy"
echo " Environment : $ENVIRONMENT"
echo " Stack       : $STACK_NAME"
echo " Region      : $REGION"
echo "======================================"

# Step 1: Deploy CFN (creates ECR repo + ECS infra)
echo "→ Deploying CloudFormation stack..."
aws cloudformation deploy \
  --template-file "$SCRIPT_DIR/cfn.yaml" \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $PROFILE \
  --parameter-overrides \
    Environment="$ENVIRONMENT" \
    AppName="$APP_NAME" \
    ImageUri="$IMAGE_URI" \
    LivekitUrl="$LIVEKIT_URL" \
    LivekitApiKey="$LIVEKIT_API_KEY" \
    LivekitApiSecret="$LIVEKIT_API_SECRET" \
    OpenaiApiKey="$OPENAI_API_KEY" \
    OpenaiModel="${OPENAI_MODEL:-gpt-4o}" \
    ElevenLabsApiKey="${ELEVENLABS_API_KEY:-}" \
    ElevenLabsVoiceId="${ELEVENLABS_VOICE_ID:-}" \
    ElevenLabsModel="${ELEVENLABS_MODEL:-eleven_flash_v2_5}" \
    DeepgramApiKey="${DEEPGRAM_API_KEY:-}" \
    GoogleCredentialsJson="${GOOGLE_CREDENTIALS_JSON:-}" \
    SttProvider="${STT_PROVIDER:-openai}" \
    LlmProvider="${LLM_PROVIDER:-openai}" \
    TtsProvider="${TTS_PROVIDER:-elevenlabs}" \
    TwilioPhoneNumber="${TWILIO_PHONE_NUMBER:-}" \
    CallLoggerUrl="${CALL_LOGGER_URL:-}" \
    TripServiceUrl="${TRIP_SERVICE_URL:-}" \
    JwtSecret="$JWT_SECRET" \
    VpcId="$VPC_ID" \
    SubnetIds="$SUBNET_IDS" \
    DesiredCount="${DESIRED_COUNT:-1}"

# Step 2: Build + push Docker image to ECR
echo "→ Logging into ECR..."
aws ecr get-login-password --region "$REGION" $PROFILE \
  | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

echo "→ Building Docker image..."
docker build -t "$IMAGE_URI" "$SCRIPT_DIR/../../src/backend/voice-agent/"

echo "→ Pushing image to ECR..."
docker push "$IMAGE_URI"

# Step 3: Force ECS to redeploy with new image — both services run the same
# image (voice-agent worker + the vision-api service, see cfn.yaml), so both
# need forcing or one keeps running the old image.
echo "→ Redeploying ECS services..."
CLUSTER=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" --region "$REGION" $PROFILE \
  --query "Stacks[0].Outputs[?OutputKey=='ECSClusterName'].OutputValue" --output text)
SERVICE=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" --region "$REGION" $PROFILE \
  --query "Stacks[0].Outputs[?OutputKey=='ECSServiceName'].OutputValue" --output text)
VISION_API_SERVICE=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" --region "$REGION" $PROFILE \
  --query "Stacks[0].Outputs[?OutputKey=='VisionApiServiceName'].OutputValue" --output text)

aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$SERVICE" \
  --force-new-deployment \
  --region "$REGION" \
  $PROFILE > /dev/null

aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$VISION_API_SERVICE" \
  --force-new-deployment \
  --region "$REGION" \
  $PROFILE > /dev/null

VISION_API_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" --region "$REGION" $PROFILE \
  --query "Stacks[0].Outputs[?OutputKey=='VoiceAgentApiUrl'].OutputValue" --output text)

echo ""
echo "======================================"
echo "✅ voice-agent deployed!"
echo " Cluster : $CLUSTER"
echo " Service : $SERVICE"
echo ""
echo "Copy into trip-service's env (VOICE_AGENT_URL):"
echo "$VISION_API_URL"
echo "======================================"
