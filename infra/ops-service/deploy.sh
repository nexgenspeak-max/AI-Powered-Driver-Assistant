#!/usr/bin/env bash
# Deploy ops-service (Dịch vụ Giám sát vận hành). Usage: bash infra/ops-service/deploy.sh [dev|uat|prod]
# Needs the other four HTTP services deployed (health probes + call records).
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"
source "$INFRA_DIR/lib/sam.sh"

load_service_env ops-service "${1:-dev}"
require_vars JWT_SECRET
env="$ENV"
url() { stack_output "$(stack_name "$1" "$env")" "$2"; }
IDENTITY_URL="$(url identity-service IdentityApiUrl)"
EXTERNAL_API_URL="$(url external-api-service ExternalApiUrl)"
CHANNEL_URL="$(url external-channel-service ExternalChannelApiUrl)"
RECORDS_URL="$(url call-records-service CallRecordsApiUrl)"
for v in IDENTITY_URL EXTERNAL_API_URL CHANNEL_URL RECORDS_URL; do
  [[ -n "${!v}" && "${!v}" != "None" ]] || { echo "❌ $v unknown — deploy that service first" >&2; exit 1; }
done

# The deployed function cannot read llm-orchestrator's files: bake the agent
# config snapshot into the bundle for this build only, then restore the placeholder.
OPS_DIR="$REPO_ROOT/src/backend/ops-service"
trap 'cp "$OPS_DIR/scripts/bundled.placeholder.ts" "$OPS_DIR/src/services/agent/bundled.ts"' EXIT
(cd "$OPS_DIR" && npm run -s snapshot:agent)

sam_deploy_stack ops-service \
  JwtSecret="$JWT_SECRET" \
  IdentityServiceUrl="$IDENTITY_URL" \
  ExternalApiServiceUrl="$EXTERNAL_API_URL" \
  ExternalChannelServiceUrl="$CHANNEL_URL" \
  CallRecordsServiceUrl="$RECORDS_URL" \
  OpenaiApiKey="${OPENAI_API_KEY:-}" \
  ReportJudgeModel="${REPORT_JUDGE_MODEL:-}" \
  ReportJudgeSample="${REPORT_JUDGE_SAMPLE:-}"
echo "VITE_OPS_SERVICE_URL=$(url ops-service OpsApiUrl)"
