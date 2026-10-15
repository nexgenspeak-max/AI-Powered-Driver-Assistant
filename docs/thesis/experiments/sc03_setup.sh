#!/usr/bin/env bash
# SC-03: dựng môi trường thử tải cô lập cho Dịch vụ Chuyến đi và Điều phối.
# - DynamoDB giả lập ở cổng 8010 (moto qua waitress: experiments/moto_keepalive.py, hoặc DynamoDB Local), thông tin đăng nhập giả;
# - bảng bench-trips với 200 tài xế giả lập × 3 chuyến (số điện thoại không có thật);
# - stub Dịch vụ Định danh ở cổng 8093; dịch vụ thử nghiệm ở cổng 8092 với ENV=bench
#   (không nạp envs/.env.local, nên không chạm AWS, Redis, LiveKit thật).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SVC="$HERE/../../../src/backend/external-api-service"
DDB=http://localhost:8010
export AWS_ACCESS_KEY_ID=bench AWS_SECRET_ACCESS_KEY=bench AWS_REGION=ap-southeast-1 AWS_PAGER=""

aws dynamodb delete-table --endpoint-url $DDB --table-name bench-trips >/dev/null 2>&1 || true
aws dynamodb create-table --endpoint-url $DDB --table-name bench-trips --billing-mode PAY_PER_REQUEST \
  --attribute-definitions AttributeName=trip_id,AttributeType=S AttributeName=status,AttributeType=S \
    AttributeName=driver_phone,AttributeType=S AttributeName=customer_phone,AttributeType=S \
    AttributeName=id_account,AttributeType=S AttributeName=created_at,AttributeType=S \
  --key-schema AttributeName=trip_id,KeyType=HASH \
  --global-secondary-indexes "$(python3 - <<'PY'
import json
idx=[("status","created_at"),("driver_phone","created_at"),("customer_phone","created_at"),("id_account","created_at")]
print(json.dumps([{"IndexName":f"{h}-{r}-index","KeySchema":[{"AttributeName":h,"KeyType":"HASH"},{"AttributeName":r,"KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}} for h,r in idx]))
PY
)" >/dev/null

TMP="$(mktemp -d)"
python3 - "$TMP" <<'PY'
import json, sys
items=[]
for d in range(200):
    phone=f"+84900000{d:03d}"
    for k,st in enumerate(["confirmed","confirmed","pending"]):
        items.append({"PutRequest":{"Item":{
          "trip_id":{"S":f"bench-{d:03d}-{k}"},"status":{"S":st},"driver_phone":{"S":phone},
          "customer_phone":{"S":f"+84910000{d:03d}"},"customer_name":{"S":f"Khach {d}"},
          "pickup_address":{"S":"1 Duong Thu Nghiem"},"dropoff_address":{"S":"2 Duong Thu Nghiem"},
          "pickup_time":{"S":f"2026-10-11T{8+k:02d}:00:00+07:00"},"fare":{"N":"100000"},
          "created_at":{"S":f"2026-10-11T0{k}:00:00Z"}}}})
for i in range(0,len(items),25):
    json.dump({"bench-trips":items[i:i+25]},open(f"{sys.argv[1]}/b{i//25:03d}.json","w"))
PY
for f in "$TMP"/b*.json; do aws dynamodb batch-write-item --endpoint-url $DDB --request-items "file://$f" >/dev/null; done
echo "seeded: $(aws dynamodb scan --endpoint-url $DDB --table-name bench-trips --select COUNT --query Count)"

node "$HERE/identity_stub.js" 8093 > "$TMP/stub.log" 2>&1 &
cd "$SVC"
env -i PATH="$PATH" HOME="$HOME" ENV=bench PORT=8092 JWT_SECRET=bench-secret DYNAMODB_TABLE=bench-trips \
  AWS_ACCESS_KEY_ID=bench AWS_SECRET_ACCESS_KEY=bench AWS_REGION=ap-southeast-1 \
  AWS_ENDPOINT_URL_DYNAMODB=$DDB IDENTITY_SERVICE_URL=http://127.0.0.1:8093 LOG_DIR="$TMP/svc-logs" \
  npx ts-node --transpile-only src/local.ts > "$TMP/svc.log" 2>&1 &
echo "service log: $TMP/svc.log"
