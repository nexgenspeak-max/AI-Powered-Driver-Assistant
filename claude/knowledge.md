# AI Driver Assistant — Project Knowledge Base

## Project Overview

**Title:** Development of an AI Voicebot for Driver Assistance: Hands-Free Communication, Trip Support, and In-Vehicle Safety
**Author:** Truong Ba Chinh (`chinh24mse13209@fsb.edu.vn`)
**Type:** Graduate Capstone / Luận văn tốt nghiệp
**Goal:** Build an AI voicebot that lets ride-hailing/delivery drivers communicate hands-free while driving.

---

## Current System Status (2026-05-24)

| Service | Status | Port / Location | Notes |
|---|---|---|---|
| **trip-service** | ✅ Running | `:8002` | DynamoDB + LiveKit token + agent dispatch |
| **voice-agent** | ✅ Running | LiveKit Cloud | `agent_name=driver-assistant` registered |
| **call-center** | ⬜ Stopped | `:8000` | Twilio webhooks — start when needed |
| **call-logger** | ⬜ Not started | `:8001` | Call records — start when needed |
| **driver-app** | ✅ Built | Expo | LiveKit voice + TranscriptionReceived |
| **customer-app** | ✅ Built | React Native | LiveKit voice + AI support screen |
| **admin-panel** | ✅ Built | `:3002` | Trip board + driver management |

**⚠ IMPORTANT:** Trip-service must use `--host 0.0.0.0` for mobile devices to connect over LAN.

---

## Actual Architecture (as built)

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
│  • Dispatches agent: CreateAgentDispatchRequest(                  │
│    agent_name="driver-assistant")                                │
│  • Trip CRUD, driver management, route calc (Google Maps)        │
│  • Admin list endpoints for dashboard                            │
└──────────────────────────────┬──────────────────────────────────┘
                               │ LiveKit Cloud (explicit dispatch)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  voice-agent worker  (Python livekit-agents)                     │
│  Registered at LiveKit Cloud as "driver-assistant"               │
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
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  call-logger  (FastAPI, port 8001, DynamoDB)                     │
│  • Receives conversation summaries from voice-agent              │
│  • Call records CRUD                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Room Name Conventions

| Pattern | Mode | Agent |
|---|---|---|
| `driver-84867347452-1748700000` | Inbound (driver opens app) | DriverAgent |
| `customer-84901234567-1748700000` | Customer support | CustomerAgent |
| `trip-abc12345` | Outbound SIP call to driver | DriverAgent (reads metadata) |

---

## Tech Stack (Actual)

| Layer | Tool | Notes |
|-------|------|-------|
| **Mobile (driver)** | Expo React Native | iOS — `npx expo run:ios` |
| **Mobile (customer)** | React Native | iOS — `npx react-native run-ios` |
| **Admin panel** | React + Vite + MUI v9 | Port 3002 |
| **Voice backend** | Python livekit-agents ≥1.2.11 | `app.main dev` |
| **Trip backend** | Python FastAPI + DynamoDB | Port 8002 |
| **Call center** | Python FastAPI + Twilio + Lambda | Port 8000 |
| **Call logger** | Python FastAPI + DynamoDB | Port 8001 |
| **STT** | OpenAI Whisper (`vi`) | configurable via `STT_PROVIDER` |
| **LLM** | GPT-4o-mini | configurable via `LLM_PROVIDER` |
| **TTS** | ElevenLabs | configurable via `TTS_PROVIDER` |
| **Voice infra** | LiveKit Cloud | WebRTC + SIP |
| **Database** | AWS DynamoDB | via `AWS_PROFILE=david` |
| **Infra** | ECS Fargate (voice-agent) + Lambda (call-center) | CloudFormation |

---

## Start Commands

```bash
# trip-service  ← --host 0.0.0.0 required for mobile devices on LAN
cd src/backend/trip-service && AWS_PROFILE=david ENV=local python -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload

# voice-agent
cd src/backend/voice-agent && ENV=local python -m app.main dev

# call-center (when needed)
cd src/backend/call-center && ENV=local python -m uvicorn app.main:app --port 8000 --reload

# call-logger (when needed)
cd src/backend/call-logger && ENV=local python -m uvicorn app.main:app --port 8001 --reload

# admin panel
cd src/frontend/admin-panel && npm run dev

# driver app (iOS)
cd src/frontend/mobile-app/driver-app && npx expo run:ios

# customer app
cd src/frontend/mobile-app/customer-app && npx react-native run-ios
```

---

## Service Directory Map

```
doantotnghiep/
├── src/
│   ├── backend/
│   │   ├── call-center/           # Step 1 ✅ — Twilio webhooks (Lambda)
│   │   ├── voice-agent/           # Step 2 ✅ — LiveKit agent worker
│   │   │   ├── app/
│   │   │   │   ├── main.py        # WorkerOptions, agent_name="driver-assistant"
│   │   │   │   ├── config/        # settings.py, logging.py
│   │   │   │   ├── providers/     # stt/, llm/, tts/ (swap via env vars)
│   │   │   │   ├── agent/
│   │   │   │   │   ├── session.py           # entrypoint — room routing
│   │   │   │   │   ├── voice_agent.py       # DriverAgent
│   │   │   │   │   ├── customer_agent.py    # CustomerAgent (new)
│   │   │   │   │   ├── prompts.py           # INBOUND_PROMPT, build_outbound_prompt
│   │   │   │   │   └── customer_prompts.py  # CUSTOMER_SUPPORT_PROMPT (new)
│   │   │   │   ├── tools/
│   │   │   │   │   ├── trip_tools.py             # 6 trip tools (raw_schema)
│   │   │   │   │   ├── customer_tools.py         # call_customer(mode), location, confirm
│   │   │   │   │   ├── call_tools.py             # summarize_last_call
│   │   │   │   │   ├── reminder_tools.py         # create_reminder
│   │   │   │   │   ├── customer_support_tools.py # get_my_trip, cancel, eta (new)
│   │   │   │   │   └── registry.py               # InboundToolsMixin, OutboundToolsMixin, CustomerAgentMixin
│   │   │   │   └── services/
│   │   │   │       ├── silence_tracker.py        # 15s/3 silences auto-end
│   │   │   │       ├── conversation_service.py   # turn recording + summary
│   │   │   │       └── backend_api.py            # httpx client for trip-service
│   │   │   ├── tests/smoke_test.py               # 33 checks
│   │   │   └── envs/.env.local
│   │   ├── trip-service/          # Step 3 ✅ — DynamoDB trips + LiveKit dispatch
│   │   │   ├── app/api/v1/
│   │   │   │   ├── trips.py       # CRUD + ?customer_phone filter
│   │   │   │   ├── drivers.py     # driver management
│   │   │   │   ├── voice.py       # /voice/token + /voice/customer-token
│   │   │   │   └── calls.py       # /calls/start (mode=agent|bridge)
│   │   │   └── app/services/
│   │   │       ├── trip_service.py    # includes list_by_customer()
│   │   │       └── dispatch_service.py # SIP outbound dispatch
│   │   └── call-logger/           # Step 4 — call records
│   └── frontend/
│       ├── admin-panel/           # Step 5 ✅ — React + Vite + MUI v9
│       └── mobile-app/
│           ├── driver-app/        # Step 6 ✅ — Expo
│           │   ├── .env           # EXPO_PUBLIC_TRIP_SERVICE_URL=http://192.168.40.230:8002
│           │   └── src/screens/
│           │       ├── LoginScreen.tsx
│           │       ├── DashboardScreen.tsx
│           │       └── DigitalHumanScreen.tsx  # LiveKit + TranscriptionReceived
│           └── customer-app/      # Step 7 ✅ — React Native
│               └── src/screens/
│                   ├── SupportScreen.tsx       # LiveKit AI voice (new)
│                   └── TripStatusScreen.tsx    # has "Talk to AI Support" button
├── infra/
│   ├── call-center/  sam.yaml + deploy.sh + teardown.sh
│   ├── voice-agent/  cfn.yaml + deploy.sh + teardown.sh
│   └── trip-service/ sam.yaml + deploy.sh + teardown.sh
└── claude/           # Project knowledge (this folder)
```

---

## Voice Agent — call_customer Two-Mode Flow

When driver says "Gọi khách hàng A để xác nhận chuyến":

1. AI asks: *"Anh/chị muốn tôi tự nói chuyện với khách rồi tóm tắt lại, hay kết nối để anh/chị nói chuyện trực tiếp?"*
2. Driver chooses:
   - **"AI nói"** → `call_customer(mode="agent")` → AI calls via SIP, conducts conversation, then reads summary back
   - **"Kết nối"** → `call_customer(mode="bridge")` → SIP bridge, driver talks directly
3. After `mode="agent"` call ends → `summarize_last_call` reads outcome aloud

---

## LiveKit SDK Patterns (livekit-agents ≥ 1.2.11)

```python
# Explicit agent dispatch (trip-service → voice-agent)
from livekit import api as lk_api
async with lk_api.LiveKitAPI(url, api_key, api_secret) as lk:
    await lk.agent.create_agent_dispatch(
        api.CreateAgentDispatchRequest(
            agent_name="driver-assistant",
            room=room_name,
        )
    )

# Session start (session.py)
session = AgentSession(stt=..., llm=..., tts=..., vad=vad, turn_detection=MultilingualModel())
await session.start(
    room=ctx.room,
    agent=DriverAgent(driver_phone=phone),
    room_input_options=RoomInputOptions(noise_cancellation=BVCTelephony()),
    room_output_options=RoomOutputOptions(transcription_enabled=True),
)

# raw_schema tool pattern
@function_tool(raw_schema={
    "name": "tool_name",
    "description": "Vietnamese description for LLM...",
    "parameters": {
        "type": "object",
        "properties": { "param": {"type": "string", "description": "..."} },
        "required": ["param"]
    }
})
async def tool_name(self, context: RunContext, param: str) -> str:
    ...
```

---

## Environment Variable Conventions

```bash
# Always use AWS_PROFILE=david for local AWS operations
AWS_PROFILE=david

# ENV controls which .env file to load: envs/.env.{ENV}
ENV=local      # → envs/.env.local
ENV=dev        # → envs/.env.dev (Lambda: injected by SAM)

# Never use AWS Secrets Manager — use .env files for all secrets
```

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
| 2026-05-22 | Explicit agent dispatch | SIP auto-dispatch unreliable |
| 2026-05-22 | Room name = driver-{phone}-{ts} | session.py can extract phone |
| 2026-05-24 | raw_schema tools | Richer Vietnamese descriptions for LLM |
| 2026-05-24 | CustomerAgent | Separate agent for customer support |
| 2026-05-24 | transcription_enabled=True | Remove manual publish_data hack |
| 2026-05-24 | BVCTelephony | Production noise cancellation for mobile |
| 2026-05-24 | SilenceTracker | Auto-end dead sessions |
| 2026-05-24 | --host 0.0.0.0 for uvicorn | Mobile devices on LAN can't reach localhost |

---

## Key Performance Targets

| Metric | Target |
|--------|--------|
| End-to-end voice latency (P50) | < 1.5s |
| End-to-end voice latency (P95) | < 1.8s |
| STT Word Error Rate (WER) | < 15% |
| Trip confirmation task success | > 90% |
| Pickup reminder on-time rate | > 95% |
| Call summary usefulness (1-5) | > 4.0 |
| Driver satisfaction (1-5) | > 4.0 |

---

## LiveKit Voice Platform Reference (production blueprint)

Captured from `genai-core-livekit-voice-platform`. Patterns used in this project:

- `BVCTelephony()` noise cancellation — from `livekit-plugins-noise-cancellation==0.2.5`
- `transcription_enabled=True` in `RoomOutputOptions`
- `MultilingualModel()` turn detection (from `livekit-plugins-turn-detector`)
- `SilenceTracker` pattern — 15s threshold, 3 max consecutive silences, sends `"<speech_not_detected>"` user input to trigger prompt before ending
- `raw_schema` tool pattern — full JSON schema with `type/name/description/parameters`
- `#nextAction=HangUp` in TTS text → intercept pattern to disconnect + shutdown

**Exact dependency versions working:**
```
livekit-agents==1.2.11
livekit-plugins-noise-cancellation==0.2.5
livekit-plugins-silero==1.2.11
livekit-plugins-turn-detector==1.2.11
livekit-plugins-openai==1.2.11
livekit-plugins-elevenlabs==1.2.11
```

---

## API Endpoints Reference

### trip-service (port 8002)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/drivers` | Driver login (upsert) |
| GET | `/api/v1/drivers/me/trips/upcoming` | Upcoming trips (X-Driver-Phone header) |
| GET | `/api/v1/drivers/me/trips/current` | Current active trip |
| GET | `/api/v1/trips?customer_phone=` | Customer's trips |
| PATCH | `/api/v1/trips/{id}/status` | Update trip status |
| GET | `/api/v1/trips/{id}/location` | Pickup location |
| POST | `/api/v1/trips/{id}/confirm-with-customer` | Send SMS to customer |
| POST | `/api/v1/voice/token` | Driver LiveKit token + dispatch agent |
| POST | `/api/v1/voice/customer-token` | Customer LiveKit token + dispatch agent |
| POST | `/api/v1/calls/start` | Start call (mode=agent\|bridge) |
| GET | `/api/v1/calls/latest` | Latest call for driver |
| POST | `/api/v1/calls/{id}/summary` | Generate call summary |
| POST | `/api/v1/reminders` | Create pickup reminder |
| GET | `/api/v1/admin/trips` | All trips (admin panel) |
| GET | `/api/v1/admin/drivers` | All drivers (admin panel) |

### voice-agent (no HTTP — LiveKit only)

Worker registers as `"driver-assistant"` via `WorkerOptions(agent_name="driver-assistant")`.
Dispatched by trip-service via `CreateAgentDispatchRequest`.
