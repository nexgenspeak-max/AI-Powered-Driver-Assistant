#!/bin/bash
# Deploy llm-orchestrator to AWS (ECR + ECS Fargate via CloudFormation)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_ENV="${1:-dev}"
ENV_FILE="$SCRIPT_DIR/../../src/backend/llm-orchestrator/envs/.env.$TARGET_ENV"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Env file not found: $ENV_FILE"
  echo "   Usage: ./deploy.sh [dev|prod]"
  exit 1
fi

export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)

CONFIG_FILE="$SCRIPT_DIR/../../src/backend/llm-orchestrator/envs/config.${TARGET_ENV}.toml"
if [[ -f "$CONFIG_FILE" ]]; then
  eval "$(python3 - "$CONFIG_FILE" << 'PY'
import shlex, sys, tomllib
with open(sys.argv[1], "rb") as handle:
    data = tomllib.load(handle)
secret_suffixes = ("_API_KEY", "_API_SECRET", "_AUTH_TOKEN", "_SECRET")
blocked = {"JWT_SECRET", "GOOGLE_CREDENTIALS_JSON", "TWILIO_ACCOUNT_SID", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"}
for key, value in data.items():
    env_key = str(key).upper()
    if env_key in blocked or env_key.endswith(secret_suffixes) or isinstance(value, (dict, list)) or value is None:
        continue
    text = ("true" if value else "false") if isinstance(value, bool) else str(value)
    print(f"export {env_key}={shlex.quote(text)}")
PY
)"
fi

ENVIRONMENT="${ENV:-dev}"
APP_NAME="driver-assistant"
STACK_NAME="${ENVIRONMENT}-${APP_NAME}-llm-orchestrator"
REGION="${AWS_REGION:-ap-southeast-1}"
PROFILE="${AWS_PROFILE:+--profile $AWS_PROFILE}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text $PROFILE)
ECR_REPO="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ENVIRONMENT}-${APP_NAME}-llm-orchestrator"
IMAGE_URI="${ECR_REPO}:latest"

echo "======================================"
echo " llm-orchestrator — Deploy"
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
    ElevenLabsApiKey="${ELEVENLABS_API_KEY:-}" \
    ElevenLabsVoiceId="${ELEVENLABS_VOICE_ID:-}" \
    ElevenLabsModel="${ELEVENLABS_MODEL:-eleven_flash_v2_5}" \
    DeepgramApiKey="${DEEPGRAM_API_KEY:-}" \
    GoogleCredentialsJson="${GOOGLE_CREDENTIALS_JSON:-}" \
    SttProvider="${STT_PROVIDER:-openai}" \
    LlmProvider="${LLM_PROVIDER:-openai}" \
    LlmModel="${LLM_MODEL:-gpt-4o-mini}" \
    TtsProvider="${TTS_PROVIDER:-elevenlabs}" \
    TwilioPhoneNumber="${TWILIO_PHONE_NUMBER:-}" \
    ExternalApiServiceUrl="${EXTERNAL_API_SERVICE_URL:-${TRIP_SERVICE_URL:-}}" \
    CallRecordsServiceUrl="${CALL_RECORDS_SERVICE_URL:-${CALL_LOGGER_URL:-}}" \
    JwtSecret="$JWT_SECRET" \
    VpcId="$VPC_ID" \
    SubnetIds="$SUBNET_IDS" \
    DesiredCount="${DESIRED_COUNT:-1}"

# Step 2: Build + push Docker image to ECR
echo "→ Logging into ECR..."
aws ecr get-login-password --region "$REGION" $PROFILE \
  | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

echo "→ Building Docker image..."
docker build -t "$IMAGE_URI" "$SCRIPT_DIR/../../src/backend/llm-orchestrator/"

echo "→ Pushing image to ECR..."
docker push "$IMAGE_URI"

# Step 3: Force ECS to redeploy with new image
echo "→ Redeploying ECS service..."
CLUSTER=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" --region "$REGION" $PROFILE \
  --query "Stacks[0].Outputs[?OutputKey=='LlmOrchestratorClusterName'].OutputValue" --output text)
SERVICE=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" --region "$REGION" $PROFILE \
  --query "Stacks[0].Outputs[?OutputKey=='LlmOrchestratorServiceName'].OutputValue" --output text)

aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$SERVICE" \
  --force-new-deployment \
  --region "$REGION" \
  $PROFILE > /dev/null

echo ""
echo "======================================"
echo "✅ llm-orchestrator deployed!"
echo " Cluster : $CLUSTER"
echo " Service : $SERVICE"
echo "======================================"
