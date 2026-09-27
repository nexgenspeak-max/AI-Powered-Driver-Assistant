#!/usr/bin/env bash
# Deploy external-api-service (Dịch vụ Chuyến đi và Điều phối). Usage: bash infra/external-api-service/deploy.sh [dev|uat|prod]
# Needs identity-service first; call-records / external-channel URLs are optional (features off when empty).
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"
source "$INFRA_DIR/lib/sam.sh"

load_service_env external-api-service "${1:-dev}"
require_vars JWT_SECRET IDENTITY_SERVICE_URL
sam_deploy_stack external-api-service \
  JwtSecret="$JWT_SECRET" \
  IdentityServiceUrl="$IDENTITY_SERVICE_URL" \
  CallRecordsServiceUrl="${CALL_RECORDS_SERVICE_URL:-}" \
  ExternalChannelServiceUrl="${EXTERNAL_CHANNEL_SERVICE_URL:-}" \
  LivekitUrl="${LIVEKIT_URL:-}" \
  LivekitApiKey="${LIVEKIT_API_KEY:-}" \
  LivekitApiSecret="${LIVEKIT_API_SECRET:-}" \
  SipTrunkId="${SIP_TRUNK_ID:-}" \
  GoogleMapsApiKey="${GOOGLE_MAPS_API_KEY:-}" \
  MapsProvider="${MAPS_PROVIDER:-}" \
  MapsApiKey="${MAPS_API_KEY:-}" \
  RedisUrl="${REDIS_URL:-}"
echo "EXTERNAL_API_SERVICE_URL=$(stack_output "$(stack_name external-api-service)" ExternalApiUrl)"
echo "Dispatch WebSocket: $(stack_output "$(stack_name external-api-service)" ExternalApiDispatchWebSocketUrl)"
