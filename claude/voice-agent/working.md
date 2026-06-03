# voice-agent — Working Log

Service: LiveKit AI voice agent worker (STT → LLM → TTS)
Stack: Python livekit-agents, local dev + ECS Fargate (CloudFormation)
Status: ✅ COMPLETE — Running locally, registered at LiveKit Cloud

---

## What This Service Does

- Long-running Python worker that connects to LiveKit Cloud as `"driver-assistant"`
- Explicit dispatch: trip-service calls `CreateAgentDispatchRequest(agent_name="driver-assistant")` when creating a room
- Routes to DriverAgent or CustomerAgent based on room name prefix
- Vietnamese voice pipeline: STT (OpenAI Whisper `vi`) → LLM (GPT-4o-mini) → TTS (ElevenLabs)
- BVCTelephony noise cancellation + native transcription (`transcription_enabled=True`)
- SilenceTracker auto-ends dead sessions (15s threshold, 3 max silences for drivers; 20s / 3 for customers)
- ConversationService records turns, generates summary, POSTs to call-logger

---

## Key Files

| File | Purpose |
|------|---------|
| `app/main.py` | WorkerOptions entry point — `agent_name="driver-assistant"` |
| `app/agent/session.py` | `entrypoint()` — parses room name → routes to DriverAgent or CustomerAgent |
| `app/agent/voice_agent.py` | `DriverAgent` — inbound driver sessions + outbound SIP |
| `app/agent/customer_agent.py` | `CustomerAgent` — customer support sessions |
| `app/agent/prompts.py` | `INBOUND_PROMPT` — includes two-mode call flow instructions |
| `app/agent/customer_prompts.py` | `CUSTOMER_SUPPORT_PROMPT` |
| `app/config/settings.py` | Provider selection via env vars |
| `app/providers/` | Factory: STT (openai/deepgram), LLM (openai/gemini), TTS (elevenlabs/google) |
| `app/tools/trip_tools.py` | `TripToolsMixin` — 6 trip management tools (raw_schema) |
| `app/tools/customer_tools.py` | `CustomerToolsMixin` — call_customer (agent/bridge), location, confirm |
| `app/tools/call_tools.py` | `CallToolsMixin` — summarize_last_call |
| `app/tools/reminder_tools.py` | `ReminderToolsMixin` — create_reminder |
| `app/tools/customer_support_tools.py` | `CustomerSupportToolsMixin` — get_my_trip, cancel_my_trip, get_driver_eta |
| `app/tools/registry.py` | `InboundToolsMixin`, `OutboundToolsMixin`, `CustomerAgentMixin` |
| `app/services/silence_tracker.py` | Auto-end dead sessions |
| `app/services/conversation_service.py` | Turn recording + summary → POSTs to call-logger |
| `app/services/backend_api.py` | Thin httpx client for trip-service + call-logger |
| `tests/smoke_test.py` | 33 checks: imports, settings, env vars, plugins, registry, room parsing |
| `envs/.env.local` | Local dev secrets |

---

## Room Name Routing (session.py)

```
driver-{phone}-{ts}   → DriverAgent  (inbound: driver opened app)
customer-{phone}-{ts} → CustomerAgent (customer support)
trip-{id}             → DriverAgent  (outbound SIP — legacy, replaced by driver-{phone}-{ts})
unknown-{anything}    → DriverAgent fallback
```

`_parse_room(room_name) -> tuple[mode, phone]` regex patterns:
```python
_DRIVER_RE   = re.compile(r"^driver-(\d+)-\d+$")
_CUSTOMER_RE = re.compile(r"^customer-(\d+)-\d+$")
_TRIP_RE     = re.compile(r"^trip-[a-z0-9]+$")
```

Outbound SIP rooms carry driver phone in `ctx.room.metadata` JSON.

---

## Tool Registry

| Mixin | Used by | Tools |
|-------|---------|-------|
| `InboundToolsMixin` | DriverAgent (inbound) | all 11 tools |
| `OutboundToolsMixin` | DriverAgent (outbound SIP) | trip tools only |
| `CustomerAgentMixin` | CustomerAgent | customer support tools (3) |

**All tools use `@function_tool(raw_schema={...})`** — full Vietnamese JSON schema descriptions for best LLM understanding.

---

## Two-Mode Call Flow (call_customer)

When driver says "Gọi khách hàng để xác nhận":

1. AI asks: *"Anh/chị muốn tôi tự nói chuyện với khách rồi tóm tắt lại, hay kết nối để anh/chị nói chuyện trực tiếp?"*
2. Driver chooses:
   - **"AI nói"** → `call_customer(mode="agent")` → POSTs to trip-service `/api/v1/calls/start` with `mode=agent`
   - **"Kết nối"** → `call_customer(mode="bridge")` → SIP bridge, driver talks directly
3. After `mode="agent"` call ends → `summarize_last_call` reads outcome aloud

---

## Provider Config

| Env Var | Current | Options |
|---------|---------|---------|
| `STT_PROVIDER` | `openai` | `openai` (Whisper vi), `deepgram` |
| `STT_MODEL` | `whisper-1` | |
| `LLM_PROVIDER` | `openai` | `openai`, `gemini` |
| `LLM_MODEL` | `gpt-4o-mini` | |
| `TTS_PROVIDER` | `elevenlabs` | `elevenlabs`, `google` (vi-VN-Neural2-A) |

---

## Credentials (envs/.env.local)

| Key | Status |
|-----|--------|
| `LIVEKIT_URL` | ✅ `wss://ai-powered-driver-assistant-77jfa364.livekit.cloud` |
| `LIVEKIT_API_KEY` | ✅ filled |
| `LIVEKIT_API_SECRET` | ✅ filled |
| `OPENAI_API_KEY` | ✅ filled |
| `ELEVENLABS_API_KEY` | ✅ filled |
| `TRIP_SERVICE_URL` | `http://localhost:8002` |
| `CALL_LOGGER_URL` | `http://localhost:8001` |

---

## Commands

```bash
# Run locally (from voice-agent directory)
cd src/backend/voice-agent && ENV=local python -m app.main dev

# Smoke test
cd src/backend/voice-agent && python tests/smoke_test.py

# Download model files (one-time)
cd src/backend/voice-agent && ENV=local python -m app.main download-files

# Deploy to AWS ECS Fargate
bash infra/voice-agent/deploy.sh dev

# Watch ECS logs
aws logs tail /ecs/dev-driver-assistant-voice-agent --follow --profile david
```

---

## Completed Steps

- [x] Full microservice structure: providers/, tools/, agent/, services/
- [x] DriverAgent with 11 tools (all `raw_schema`) — Vietnamese descriptions
- [x] CustomerAgent with 3 customer support tools
- [x] Two-mode `call_customer`: agent / bridge
- [x] `summarize_last_call` — reads outcome after agent-mode call
- [x] BVCTelephony noise cancellation
- [x] Native transcription (`transcription_enabled=True`)
- [x] SilenceTracker (auto-end dead sessions)
- [x] ConversationService (turn recording + summary → call-logger)
- [x] Outbound SIP room routing
- [x] Smoke test (33 checks) — all passing
- [x] Downloaded Silero VAD + turn detector ONNX models
- [x] Running locally, registered at LiveKit Cloud

## Remaining

- [ ] Deploy to ECS Fargate (need `VPC_ID` + `SUBNET_IDS` in `.env.dev`)
- [ ] SIP outbound: test real Twilio SIP call flow end-to-end

---

## Known Issues / Lessons

- `python -m app.main download-files` must run once before first start (Silero + turn detector ONNX)
- `MultilingualModel()` requires active job context — only import, don't instantiate outside a job
- `DriverAgent()` instantiation triggers LiveKit internal attribute access — check tool registry at class level: `hasattr(InboundToolsMixin, "check_upcoming_trips")`
- ElevenLabs plugin reads `ELEVEN_API_KEY` not `ELEVENLABS_API_KEY` — always pass `api_key=` explicitly
- `[transformers] PyTorch was not found` — non-fatal; turn-detector falls back to ONNX runtime
- Room regex `_TRIP_RE` uses lowercase `[a-z0-9]+` — trip IDs must be lowercase
- Trip-service must start with `--host 0.0.0.0` for mobile devices on LAN to connect
