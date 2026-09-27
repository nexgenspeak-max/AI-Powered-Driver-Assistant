#!/usr/bin/env bash
# Deploy external-channel-service (Dịch vụ Kênh liên lạc). Usage: bash infra/external-channel-service/deploy.sh [dev|uat|prod]
# Twilio webhooks need the service's own public URL, which only exists after the
# first deploy: deploy, read the API URL, redeploy with it when it changed.
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"
source "$INFRA_DIR/lib/sam.sh"

load_service_env external-channel-service "${1:-dev}"
require_vars JWT_SECRET TWILIO_ACCOUNT_SID TWILIO_AUTH_TOKEN TWILIO_PHONE_NUMBER
deploy() {
  sam_deploy_stack external-channel-service \
    JwtSecret="$JWT_SECRET" \
    TwilioAccountSid="$TWILIO_ACCOUNT_SID" \
    TwilioAuthToken="$TWILIO_AUTH_TOKEN" \
    TwilioPhoneNumber="$TWILIO_PHONE_NUMBER" \
    ExternalChannelBaseUrl="${1:-}"
}
deploy "${BASE_URL:-}"
url="$(stack_output "$(stack_name external-channel-service)" ExternalChannelApiUrl)"
if [[ -n "$url" && "$url" != "None" && "$url" != "${BASE_URL:-}" ]]; then
  echo "→ Redeploying with BASE_URL=$url for Twilio callbacks"
  set_env_var "$REPO_ROOT/src/backend/external-channel-service/envs/.env.${ENV}" BASE_URL "$url"
  deploy "$url"
fi
echo "EXTERNAL_CHANNEL_SERVICE_URL=$url"
echo "Twilio voice webhook: $(stack_output "$(stack_name external-channel-service)" ExternalChannelInboundWebhookUrl)"
