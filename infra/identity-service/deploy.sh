#!/usr/bin/env bash
# Deploy identity-service (Dịch vụ Định danh). Usage: bash infra/identity-service/deploy.sh [dev|uat|prod]
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"
source "$INFRA_DIR/lib/sam.sh"

load_service_env identity-service "${1:-dev}"
require_vars JWT_SECRET
sam_deploy_stack identity-service \
  JwtSecret="$JWT_SECRET" \
  JwtAccessExpiresIn="${JWT_ACCESS_EXPIRES_IN:-15m}" \
  JwtRefreshExpiresIn="${JWT_REFRESH_EXPIRES_IN:-30d}"
echo "IDENTITY_SERVICE_URL=$(stack_output "$(stack_name identity-service)" IdentityApiUrl)"
