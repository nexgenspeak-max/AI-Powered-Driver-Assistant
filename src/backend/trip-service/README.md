# trip-service

Manages trips and dispatches outbound calls to drivers via LiveKit SIP.
Prefetches Google Maps route (ETA, traffic) when a trip is created so the voice-agent can read it to the driver instantly.

## Local dev

### 1. Create DynamoDB table (one-time)

```bash
aws dynamodb create-table \
  --table-name local-driver-assistant-trips \
  --attribute-definitions \
    AttributeName=trip_id,AttributeType=S \
    AttributeName=status,AttributeType=S \
    AttributeName=driver_phone,AttributeType=S \
    AttributeName=created_at,AttributeType=S \
  --key-schema AttributeName=trip_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[
    {"IndexName":"status-created_at-index","KeySchema":[{"AttributeName":"status","KeyType":"HASH"},{"AttributeName":"created_at","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}},
    {"IndexName":"driver_phone-created_at-index","KeySchema":[{"AttributeName":"driver_phone","KeyType":"HASH"},{"AttributeName":"created_at","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}
  ]' \
  --profile david --region ap-southeast-1
```

### 2. Fill in envs/.env.local

```env
GOOGLE_MAPS_API_KEY=   # get from console.cloud.google.com → Directions API
```

LiveKit keys are pre-filled. AWS profile is david.

For **driver → customer calls** (voice-agent `call_customer` tool):

```env
CALL_CENTER_URL=http://localhost:8000
TWILIO_VERIFIED_TO=+84867347452
CALL_FORCE_VERIFIED_TO=true   # Twilio trial: always dial verified number locally
```

Start **call-center** on port 8000 (see `src/backend/call-center/README.md`) with Twilio credentials + `BASE_URL` (ngrok when local).

### 3. Start the service

```bash
cd src/trip-service
pip install -r requirements.txt
AWS_PROFILE=david uvicorn app.main:app --reload --port 8002
```

### 4. Test the full flow

```bash
# Create a trip (fetches Google Maps route automatically)
curl -X POST http://localhost:8002/api/v1/trips \
  -H "Content-Type: application/json" \
  -d '{
    "driver_phone": "+84867347452",
    "customer_name": "Nguyễn Văn A",
    "pickup_address": "123 Lê Lợi, Quận 1, TP.HCM",
    "dropoff_address": "45 Nguyễn Huệ, Quận 1, TP.HCM",
    "pickup_time": "14:30"
  }'

# List trips
curl http://localhost:8002/api/v1/trips

# Dispatch outbound call to driver (LiveKit calls their phone)
curl -X POST http://localhost:8002/api/v1/trips/{trip_id}/dispatch

# Simulate driver accepting (normally done by voice-agent)
curl -X PATCH http://localhost:8002/api/v1/trips/{trip_id} \
  -H "Content-Type: application/json" \
  -d '{"status": "confirmed"}'
```

---

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/trips` | Create trip (prefetches Maps route) |
| `GET` | `/api/v1/trips` | List trips (`?status=pending` to filter) |
| `GET` | `/api/v1/trips/{trip_id}` | Get one trip |
| `PATCH` | `/api/v1/trips/{trip_id}` | Update status (called by voice-agent) |
| `POST` | `/api/v1/trips/{trip_id}/dispatch` | Trigger outbound call to driver |
| `POST` | `/api/v1/calls/start` | Driver calls customer (Twilio via call-center) |

## Trip statuses

```
pending → calling → confirmed
                 → rejected
                 → no_answer
```

---

## Deploy

```bash
bash infra/trip-service/deploy.sh dev
# Output: TRIP_SERVICE_URL=https://xxx... → paste into voice-agent .env.dev

bash infra/trip-service/teardown.sh dev   # DynamoDB table is kept
```
