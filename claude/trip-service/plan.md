# trip-service — Plan

## What This Adds

Admin or dispatcher creates a trip (customer phone, pickup location, time).
System automatically calls the assigned driver via voice bot to confirm.
Driver says "accept" or "reject" → status updates in real time on the admin panel.

---

## Full System Flow

```
Admin Panel (React)
  → POST /trips          create trip (customer info + driver phone)
  → trip-service saves trip → status: pending

trip-service
  → calls LiveKit API    create room with trip metadata
  → calls LiveKit SIP API  create outbound SIP participant (dials driver's phone via Twilio)

LiveKit + Twilio
  → driver's phone rings
  → driver picks up → voice-agent job dispatched

voice-agent
  → reads trip metadata from room (trip_id, customer, location, time)
  → bot: "Xin chào anh Minh, có chuyến đi từ Quận 1 đến Quận 7 lúc 14:30.
          Anh có nhận chuyến này không?"
  → driver: "Nhận" → agent calls PATCH /trips/{id} status=confirmed
  → driver: "Không" → agent calls PATCH /trips/{id} status=rejected

Admin Panel
  → WebSocket receives status update → shows confirmed / rejected in real time
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│              Admin Panel  (React SPA)                    │
│   Create trip │ Driver list │ Live status board          │
└────────────────────────┬─────────────────────────────────┘
                         │  REST + WebSocket
┌────────────────────────▼─────────────────────────────────┐
│              trip-service  (FastAPI + DynamoDB)           │
│  POST /trips              create trip                    │
│  GET  /trips              list trips                     │
│  PATCH /trips/{id}        update status (from agent)     │
│  POST /trips/{id}/dispatch  trigger outbound call        │
│  WS   /ws/trips           push status changes to admin   │
└──────────┬──────────────────────────┬────────────────────┘
           │ LiveKit Admin API        │ called by agent
           ▼                          ▼
┌─────────────────────┐    ┌─────────────────────────────┐
│  LiveKit Cloud      │    │  voice-agent (ECS Fargate)  │
│  create room        │    │  reads trip from room meta  │
│  create SIP         │    │  Vietnamese dialogue        │
│  participant        │    │  confirm/reject → PATCH     │
│  (calls driver)     │    └─────────────────────────────┘
└─────────────────────┘
```

---

## New Services

### 1. trip-service (backend)

| | |
|---|---|
| **Stack** | FastAPI + DynamoDB |
| **Infra** | AWS Lambda + API Gateway (SAM) — same pattern as call-logger |
| **Location** | `src/trip-service/` |

**DynamoDB table:** `{env}-driver-assistant-trips`

| Field | Type | Description |
|---|---|---|
| `trip_id` | String PK | UUID |
| `status` | String | `pending` → `calling` → `confirmed` / `rejected` / `no_answer` |
| `driver_phone` | String | e.g. `+84867347452` |
| `customer_name` | String | e.g. `Nguyễn Văn A` |
| `pickup_address` | String | e.g. `123 Lê Lợi, Quận 1` |
| `dropoff_address` | String | |
| `pickup_time` | String | ISO 8601 |
| `room_name` | String | LiveKit room created for this call |
| `created_at` | String | ISO 8601 |
| `updated_at` | String | ISO 8601 |

**API endpoints:**

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/trips` | Create a trip |
| `GET` | `/api/v1/trips` | List all trips |
| `GET` | `/api/v1/trips/{trip_id}` | Get one trip |
| `PATCH` | `/api/v1/trips/{trip_id}` | Update status (called by voice-agent) |
| `POST` | `/api/v1/trips/{trip_id}/dispatch` | Trigger outbound call to driver |
| `WS` | `/ws/trips` | Real-time status push to admin panel |

---

### 2. Admin Panel (frontend)

| | |
|---|---|
| **Stack** | React + Vite + TailwindCSS |
| **Location** | `src/admin-panel/` |
| **Infra** | Run locally for dev; S3 + CloudFront for prod |

**Pages / screens:**

| Screen | What it shows |
|---|---|
| Trip Board | Table of all trips + live status badges |
| Create Trip | Form: driver phone, customer name, pickup address, dropoff, time |
| Trip Detail | Full trip info + call status + outcome |

Status badges: `🟡 pending` → `📞 calling` → `✅ confirmed` / `❌ rejected` / `📵 no answer`

Real-time: WebSocket to `/ws/trips` — status badge updates instantly when driver responds.

---

### 3. voice-agent upgrades

**3a. Read trip context from room metadata**

When trip-service creates the LiveKit room it sets metadata:
```json
{
  "trip_id": "uuid",
  "driver_phone": "+84867347452",
  "customer_name": "Nguyễn Văn A",
  "pickup_address": "123 Lê Lợi, Quận 1",
  "dropoff_address": "45 Nguyễn Huệ, Quận 1",
  "pickup_time": "14:30"
}
```

Agent reads this in `entrypoint`:
```python
import json
meta = json.loads(ctx.room.metadata or "{}")
trip_id = meta.get("trip_id")
```

**3b. Different greeting for outbound vs inbound**

- Inbound (driver calls in): `"Xin chào! Tôi là trợ lý AI. Tôi có thể giúp gì?"`
- Outbound (system calls driver): `"Xin chào anh/chị, đây là hệ thống trợ lý tài xế. Có chuyến đi mới từ [pickup] đến [dropoff] lúc [time]. Anh/chị có nhận chuyến không?"`

Detect by checking `meta.get("trip_id")`.

**3c. confirm_trip / reject_trip now call trip-service API**

```python
@function_tool
async def confirm_trip(self, context: RunContext) -> str:
    # PATCH trip-service /api/v1/trips/{trip_id}  status=confirmed
    ...

@function_tool
async def reject_trip(self, context: RunContext) -> str:
    # PATCH trip-service /api/v1/trips/{trip_id}  status=rejected
    ...
```

---

## Implementation Order

### Phase 1 — trip-service backend (no frontend yet)
1. `src/trip-service/` — FastAPI app, DynamoDB CRUD, same structure as call-logger
2. `POST /trips` and `PATCH /trips/{id}` endpoints
3. `POST /trips/{id}/dispatch` — create LiveKit room with metadata + outbound SIP call
4. Test with curl: create trip → dispatch → phone rings → agent answers

### Phase 2 — voice-agent upgrades
5. Read room metadata in `entrypoint`
6. Outbound greeting with trip details
7. `confirm_trip` / `reject_trip` tools call trip-service API
8. Test full loop: create trip → call → driver accepts → status = confirmed

### Phase 3 — admin panel
9. `src/admin-panel/` React + Vite
10. Trip list + create form
11. WebSocket for live status
12. Test end-to-end: admin creates trip → driver phone rings → admin sees status update

---

## How Outbound SIP Call Works

LiveKit has an API to create an outbound SIP call. trip-service calls it:

```python
from livekit import api

lk = api.LiveKitAPI(url, api_key, api_secret)

# 1. Create room with trip metadata
await lk.room.create_room(api.CreateRoomRequest(
    name=room_name,
    metadata=json.dumps(trip_meta),
))

# 2. Create outbound SIP participant — LiveKit dials the driver's phone
await lk.sip.create_sip_participant(api.CreateSIPParticipantRequest(
    sip_trunk_id="ST_65EBPmZTeo3b",   # existing Twilio SIP trunk
    sip_call_to=driver_phone,          # e.g. +84867347452
    room_name=room_name,
    participant_name="driver",
))
# The agent dispatch rule fires automatically when a participant joins the room
```

No changes needed to LiveKit SIP trunk or dispatch rule — the existing `SDR_rLQY2QxSoQeU` rule already dispatches the agent to any room matching the pattern.

---

## Key Config (new env vars needed)

**trip-service:**
```env
DYNAMODB_TABLE=dev-driver-assistant-trips
LIVEKIT_URL=wss://ai-powered-driver-assistant-77jfa364.livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
SIP_TRUNK_ID=ST_65EBPmZTeo3b
```

**voice-agent (add):**
```env
TRIP_SERVICE_URL=https://xxx.execute-api.ap-southeast-1.amazonaws.com/dev
```

---

## Cost estimate (Phase 1–3, dev usage)

| Resource | Cost |
|---|---|
| Lambda (trip-service) | ~$0 at this scale |
| DynamoDB (trips table) | < $0.01/month |
| LiveKit outbound SIP | ~$0.01/min/call |
| Twilio SIP | ~$0.01/min/call |
| S3 + CloudFront (admin panel) | < $1/month |
| **Total** | **~$0.02 per call dispatched** |
