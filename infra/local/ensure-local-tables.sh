#!/usr/bin/env bash
# Create / upgrade the DynamoDB tables used by local development (idempotent).
#   - call-records: add GSI record_date-started_at-index (daily reports; without it
#     call-records-service falls back to a filtered scan)
#   - channel events / ops daily reports: optional — the services use local files
#     unless EVENTS_TABLE / REPORTS_TABLE are set in their .env.local
# Usage: AWS_PROFILE=<profile> bash infra/local/ensure-local-tables.sh [--with-optional]
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/common.sh"
check_aws_credentials
REGION="${AWS_REGION:-ap-southeast-1}"
aws_ddb() { aws dynamodb "$@" --region "$REGION" $(aws_profile_args); }

RECORDS=local-driver-assistant-call-records
if aws_ddb describe-table --table-name "$RECORDS" --query 'Table.GlobalSecondaryIndexes[].IndexName' --output text | grep -q record_date-started_at-index; then
  echo "✅ $RECORDS already has record_date-started_at-index"
else
  echo "→ Adding record_date-started_at-index to $RECORDS"
  aws_ddb update-table --table-name "$RECORDS" \
    --attribute-definitions AttributeName=record_date,AttributeType=S AttributeName=started_at,AttributeType=S \
    --global-secondary-index-updates '[{"Create":{"IndexName":"record_date-started_at-index","KeySchema":[{"AttributeName":"record_date","KeyType":"HASH"},{"AttributeName":"started_at","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}}]' >/dev/null
  echo "   (index builds in the background; older records without record_date are not in it)"
fi

if [[ "${1:-}" == "--with-optional" ]]; then
  create() { # <table> <create-table args...>
    local t="$1"; shift
    if aws_ddb describe-table --table-name "$t" >/dev/null 2>&1; then echo "✅ $t exists"; return; fi
    echo "→ Creating $t"; aws_ddb create-table --table-name "$t" --billing-mode PAY_PER_REQUEST "$@" >/dev/null
  }
  create local-driver-assistant-channel-events \
    --attribute-definitions AttributeName=sid,AttributeType=S AttributeName=sk,AttributeType=S AttributeName=event_date,AttributeType=S \
    --key-schema AttributeName=sid,KeyType=HASH AttributeName=sk,KeyType=RANGE \
    --global-secondary-indexes '[{"IndexName":"event_date-sk-index","KeySchema":[{"AttributeName":"event_date","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]'
  create local-driver-assistant-ops-daily-reports \
    --attribute-definitions AttributeName=report_date,AttributeType=S \
    --key-schema AttributeName=report_date,KeyType=HASH
  echo "Set EVENTS_TABLE=local-driver-assistant-channel-events (external-channel-service) and"
  echo "    REPORTS_TABLE=local-driver-assistant-ops-daily-reports (ops-service) in their .env.local to use them."
fi
