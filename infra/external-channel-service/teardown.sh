#!/usr/bin/env bash
# Delete the external-channel-service stack (DynamoDB tables are retained). Usage: bash infra/external-channel-service/teardown.sh [dev|uat|prod]
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"
source "$INFRA_DIR/lib/sam.sh"
export ENV="${1:-dev}"
teardown_stack external-channel-service
