# Working Notes — AI Driver Assistant

Live session log. Updated as work progresses. Use this to resume any session instantly.

## Per-Service Working Logs (detailed)

- [`claude/call-center/working.md`](call-center/working.md) — ✅ Complete
- [`claude/voice-agent/working.md`](voice-agent/working.md) — ✅ Complete (running locally)
- [`claude/trip-service/plan.md`](trip-service/plan.md) — ✅ Complete (running locally)
- [`claude/frontend.md`](frontend.md) — ✅ Admin panel complete
- [`claude/knowledge.md`](knowledge.md) — Full architecture + production platform reference

---

## Current System Status (2026-05-24)

| Service | Status | Port | Notes |
|---|---|---|---|
| **trip-service** | ✅ Running | `:8002` | DynamoDB + LiveKit token + agent dispatch |
| **voice-agent** | ✅ Running | LiveKit Cloud | `agent_name=driver-assistant` registered |
| **call-center** | ⬜ Stopped | `:8000` | Twilio webhooks — start when needed |
| **call-logger** | ⬜ Not started | `:8001` | Call records — start when needed |
| **driver-app** | ✅ Built | Expo | LiveKit voice + TranscriptionReceived |
| **customer-app** | ✅ Built | React Native | LiveKit voice + AI support screen |
| **admin-panel** | ✅ Built | `:3002` | Trip board + driver management |

### Start commands

```bash
# trip-service  (--host 0.0.0.0 required so mobile devices on LAN can reach it)
cd src/backend/trip-service && AWS_PROFILE=david ENV=local python -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload

# voice-agent
cd src/backend/voice-agent && ENV=local python -m app.main dev

# admin panel
cd src/frontend/admin-panel && npm run dev

# driver app (iOS)
cd src/frontend/mobile-app/driver-app && npx expo run:ios

# customer app
cd src/frontend/mobile-app/customer-app && npx react-native run-ios
```

---

## Architecture (Actual, as built)

```
┌─────────────────────────────────────────────────────────────────┐
│  Mobile Apps                                                      │
│  driver-app (Expo)           customer-app (React Native)         │
│    └── DigitalHumanScreen      └── SupportScreen                 │
│         LiveKit WebRTC              LiveKit WebRTC                │
└──────────────────┬──────────────────────────┬────────────────────┘
                   │ POST /api/v1/voice/token  │ POST /api/v1/voice/customer-token
                   ▼                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  trip-service  (FastAPI, port 8002, DynamoDB)                    │
│  • Creates LiveKit room + JWT token                              │
│  • Dispatches agent: CreateAgentDispatchRequest(agent_name=      │
│    "driver-assistant")                                           │
│  • Trip CRUD, driver management, route calc (Google Maps)        │
└──────────────────────────────┬──────────────────────────────────┘
                               │ LiveKit Cloud (explicit dispatch)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  voice-agent worker  (Python livekit-agents, registers at        │
│  LiveKit Cloud as "driver-assistant")                            │
│                                                                  │
│  Room routing (session.py _parse_room):                          │
│    driver-{phone}-{ts}   → DriverAgent  (inbound)               │
│    customer-{phone}-{ts} → CustomerAgent (support)              │
│    trip-{id}             → DriverAgent  (outbound SIP)           │
│                                                                  │
│  Pipeline:                                                       │
│    STT (OpenAI Whisper vi) → LLM (GPT-4o-mini) → TTS (ElevenLabs)│
│    BVCTelephony noise cancel + transcription_enabled=True        │
│    SilenceTracker (15s threshold, 3 max silences)               │
└─────────────────────────────────────────────────────────────────┘
```

### Room name conventions

| Pattern | Mode | Agent |
|---|---|---|
| `driver-84867347452-1748700000` | Inbound (driver opens app) | DriverAgent |
| `customer-84901234567-1748700000` | Customer support | CustomerAgent |
| `trip-abc12345` | Outbound SIP call to driver | DriverAgent (reads metadata) |

### Trip status values

Source of truth: `ALLOWED_STATUSES` in [`trips.ts`](../src/backend/trip-service/src/routes/trips.ts).

| Status | Meaning | Terminal? |
|---|---|---|
| `pending` | Trip created, not yet notified/dispatched | |
| `notified` | Driver notified of the trip request | |
| `calling` | AI/SIP call to driver in progress | |
| `confirmed` | Driver confirmed the trip | |
| `no_answer` | Driver didn't answer the call | |
| `arrived_pickup` | Driver arrived at pickup location | |
| `picked_up` | Customer picked up, trip underway | |
| `completed` | Trip finished successfully | ✅ |
| `rejected` | Driver rejected the trip | ✅ |
| `cancelled` | Trip cancelled (customer/system) | ✅ |
| `cancelled_by_driver` | Trip cancelled by driver | ✅ |
| `no_show` | Customer didn't show up | ✅ |

Terminal statuses (`rejected`, `cancelled`, `cancelled_by_driver`) block further status changes — a new trip must be booked instead.

### Trip status flow

```
                    ┌──────────────────────────────┐
                    │   POST /trips/:id/dispatch    │  (retry allowed from
                    ▼                                │   pending/notified/
pending ──(auto)──▶ notified ──dispatch──▶ calling ──┘   rejected/no_answer)
                                              │
                    ┌─────────────┬───────────┼───────────────┐
                    ▼             ▼           ▼               ▼
                confirmed     rejected    no_answer        (retry via
             (confirm_trip)  (reject_trip)  (SIP timeout)   /dispatch)
                    │             ✅            │
                    ▼                           └──▶ back to calling (redispatch)
              arrived_pickup
                    │
                    ▼
                picked_up
                    │
                    ▼
                completed ✅

  From almost any non-terminal state:
    • cancel_my_trip / customer_support cancel  ──▶ cancelled ✅
    • confirm_cancel_trip (driver)               ──▶ cancelled_by_driver ✅
    • POST /trips/:id/no-show                    ──▶ no_show ✅
```

- `pending → notified` happens automatically right after trip creation (`tripService.create` → immediate `updateStatus('notified')`).
- `notified/pending/rejected/no_answer → calling` only via `POST /trips/:tripId/dispatch` (also triggers the SIP call). This is how a rejected or unanswered trip gets redispatched to try again.
- `calling → confirmed` / `calling → rejected` are set by the driver via voice tools (`confirm_trip.py`, `reject_trip.py`) through the generic `PATCH /trips/:tripId`.
- `arrived_pickup → picked_up → completed` are set by the driver app / `update_trip_status` voice tool, no dedicated endpoints — same generic `PATCH`.
- Once a trip hits a terminal status (✅), `PATCH` is rejected with `409` — the app must book a new trip instead of resurrecting the old one.
- Simplified version of this flow (Vietnamese, driver-facing) also lives in [`app-playbook.md §5`](../src/backend/voice-agent/requirements/knowledge/vi/app-playbook.md#L115) — keep both in sync if status logic changes.

---

## Completed Work (by step)

### Step 1 — call-center ✅
- Twilio inbound/outbound webhook handling
- Auto-transcribe + summarise caller
- Deployed to AWS Lambda

### Step 2 — voice-agent ✅
- Full microservice with providers/, tools/, agent/, services/ layout
- DriverAgent with 11 tools (all `raw_schema`)
- CustomerAgent with 3 customer support tools
- BVCTelephony noise cancellation
- Native transcription (transcription_enabled=True)
- SilenceTracker (auto-end dead sessions)
- ConversationService (records turns, generates summary, POSTs to call-logger)
- Smoke test: `python tests/smoke_test.py`
- Running locally, registered at LiveKit Cloud

### Step 3 — trip-service ✅
- DynamoDB CRUD for trips + drivers
- Google Maps route calculation
- Voice token endpoints (driver + customer)
- Explicit agent dispatch on token creation
- Admin list endpoints for dashboard
- SIP outbound dispatch via dispatch_service

### Step 4 — admin panel ✅
- React + Vite + MUI v9
- Trip board with live polling
- Driver management
- Create trip + dispatch

### Step 5 — driver app ✅
- Expo React Native
- Auth (phone + name)
- Dashboard with trip list
- DigitalHumanScreen: LiveKit voice + TranscriptionReceived
- Connects to trip-service for token, LiveKit for voice

### Step 6 — customer app ✅ (this session)
- BookingScreen + TripStatusScreen (existed)
- SupportScreen: LiveKit AI voice support (new)
- Added @livekit/react-native + livekit-client
- Talk to AI Support button on TripStatusScreen
- Customer voice token via /api/v1/voice/customer-token

---

## call_customer — Two-Mode Call Flow

When driver says "Gọi khách hàng A để xác nhận chuyến":

1. AI asks: *"Anh/chị muốn tôi tự nói chuyện với khách rồi tóm tắt lại, hay kết nối để anh/chị nói trực tiếp?"*
2. Driver chooses:
   - **"AI nói"** → `call_customer(mode="agent")` → AI calls via SIP, conducts conversation, then reads summary back
   - **"Kết nối"** → `call_customer(mode="bridge")` → SIP bridge, driver talks directly
3. After `mode="agent"` call ends → `summarize_last_call` reads the outcome aloud

---

## Decisions Log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-05-16 | Twilio (not VAPI) | Simpler, cheaper |
| 2026-05-16 | Lambda for call-center | Stateless webhooks, scales to zero |
| 2026-05-16 | ECS Fargate for voice-agent | Persistent WebRTC connection |
| 2026-05-16 | No Secrets Manager | Expensive for thesis — .env files |
| 2026-05-16 | AWS_PROFILE=david always | Personal dev profile |
| 2026-05-22 | Restructure voice-agent | providers/ tools/ agent/ services/ |
| 2026-05-22 | explicit agent dispatch | SIP auto-dispatch unreliable |
| 2026-05-22 | room name = driver-{phone}-{ts} | Session.py can extract phone |
| 2026-05-24 | raw_schema tools | Richer Vietnamese descriptions for LLM |
| 2026-05-24 | CustomerAgent | Separate agent for customer support |
| 2026-05-24 | transcription_enabled=True | Remove manual publish_data hack |
| 2026-05-24 | BVCTelephony | Production noise cancellation for mobile |
| 2026-05-24 | SilenceTracker | Auto-end dead sessions |
