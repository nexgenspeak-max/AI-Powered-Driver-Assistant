#!/usr/bin/env bash
# Deploy call-records-service (Dịch vụ Lưu vết cuộc gọi). Usage: bash infra/call-records-service/deploy.sh [dev|uat|prod]
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"
source "$INFRA_DIR/lib/sam.sh"

load_service_env call-records-service "${1:-dev}"
require_vars JWT_SECRET
sam_deploy_stack call-records-service JwtSecret="$JWT_SECRET"
echo "CALL_RECORDS_SERVICE_URL=$(stack_output "$(stack_name call-records-service)" CallRecordsApiUrl)"
