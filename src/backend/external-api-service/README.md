# external-api-service

Manages trips and dispatches outbound calls to drivers via LiveKit SIP.
Prefetches Google Maps route (ETA, traffic) when a trip is created so the llm-orchestrator can read it to the driver instantly.

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

For **driver → customer calls** (`call_customer` agent + bridge modes use **LiveKit SIP in-room**):

```env
SIP_TRUNK_ID=ST_...              # same outbound trunk as trip dispatch
LIVEKIT_URL=wss://...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
TWILIO_VERIFIED_TO=+84867347452  # Twilio trial: dial verified number locally
CALL_FORCE_VERIFIED_TO=true
```

`EXTERNAL_CHANNEL_SERVICE_URL` is not required for in-room agent or bridge calls. Twilio SMS and PSTN live in external-channel-service.

### 3. Start the service

```bash
cd src/backend/external-api-service
npm install
npm run dev
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

# Simulate driver accepting (normally done by llm-orchestrator)
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
| `PATCH` | `/api/v1/trips/{trip_id}` | Update status (called by llm-orchestrator) |
| `POST` | `/api/v1/trips/{trip_id}/dispatch` | Trigger outbound call to driver |
| `POST` | `/api/v1/calls/start` | Driver calls customer (Twilio via external-channel-service) |

## Trip statuses

```
pending → calling → confirmed
                 → rejected
                 → no_answer
```

---

## Deploy

```bash
bash infra/external-api-service/deploy.sh dev
# Output: EXTERNAL_API_SERVICE_URL=https://xxx... → paste into llm-orchestrator envs/.env.dev
# TRIP_SERVICE_URL is still accepted as an alias.

bash infra/external-api-service/teardown.sh dev   # DynamoDB table is kept
```
