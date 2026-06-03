# LiveKit Knowledge Base

> Captured from official LiveKit docs (docs.livekit.io) and GitHub (github.com/livekit/agents).
> Last updated: 2026-05-16. LiveKit Agents version: 1.2.11 (production reference) / latest on GitHub.

---

## What is LiveKit?

LiveKit is an open-source WebRTC server (Go) that provides real-time video, audio, and data infrastructure. It uses an SFU (Selective Forwarding Unit) architecture.

**LiveKit Agents** is the AI application framework on top of LiveKit for building voice, video, and physical AI agents.

**LiveKit SIP** bridges traditional phone networks (PSTN) with LiveKit rooms so AI agents can handle real phone calls.

---

## Core Architecture

```
Phone Call / Mobile App / Web App
        ↓  WebRTC / SIP
   LiveKit Server (cloud or self-hosted)
        ↓  Jobs dispatched to agent workers
   Agent Worker Process (Python FastAPI app)
        ├── STT (Speech-to-Text)
        ├── LLM (Language Model)
        └── TTS (Text-to-Speech)
```

**Key components:**
- **Room**: A virtual space where participants exchange media
- **Participant**: Anyone in a room (human, SIP caller, agent)
- **SIP Participant**: A LiveKit participant that represents a phone caller
- **AgentSession**: Orchestrates STT → LLM → TTS pipeline
- **Agent**: Defines the bot's personality, tools, and behavior
- **Trunk**: Bridges a SIP provider (Twilio, Telnyx) with LiveKit
- **Dispatch Rule**: Routes inbound calls to specific LiveKit rooms

---

## Latest Agent Pattern (livekit-agents ≥ 1.2.x)

> **Important:** The new API uses `AgentServer` + `@server.rtc_session()` instead of the old `WorkerOptions` + `entrypoint` pattern.
> The production reference implementation still uses the old pattern (WorkerOptions) — both work.

### New Pattern (latest GitHub examples)

```python
import logging
from dotenv import load_dotenv
from livekit.agents import (
    Agent, AgentServer, AgentSession, JobContext, JobProcess,
    MetricsCollectedEvent, RunContext, TurnHandlingOptions,
    cli, inference, metrics, room_io, text_transforms,
)
from livekit.agents.beta import EndCallTool
from livekit.agents.llm import function_tool
from livekit.plugins import silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

load_dotenv()

class MyAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="Your name is Kelly...",
            tools=[EndCallTool()],
        )

    async def on_enter(self) -> None:
        self.session.generate_reply(instructions="greet the user")

    @function_tool
    async def lookup_weather(self, context: RunContext, location: str) -> str:
        """Called when the user asks about weather.
        Args:
            location: The city or region
        """
        return "sunny, 70 degrees"

server = AgentServer()

def prewarm(proc: JobProcess) -> None:
    proc.userdata["vad"] = silero.VAD.load()

server.setup_fnc = prewarm

@server.rtc_session()
async def entrypoint(ctx: JobContext) -> None:
    session = AgentSession(
        stt=inference.STT("deepgram/nova-3", language="multi"),
        llm=inference.LLM("openai/gpt-4.1-mini"),
        tts=inference.TTS("cartesia/sonic-3", voice="9626c31c-bec5-4cca-baa8-f8ba9e84c8bc"),
        vad=ctx.proc.userdata["vad"],
        turn_handling=TurnHandlingOptions(
            turn_detection=MultilingualModel(),
            interruption={
                "resume_false_interruption": True,
                "false_interruption_timeout": 1.0,
            },
        ),
        preemptive_generation=True,
        aec_warmup_duration=3.0,
        tts_text_transforms=["filter_emoji", "filter_markdown"],
    )

    @session.on("metrics_collected")
    def on_metrics(ev: MetricsCollectedEvent):
        metrics.log_metrics(ev.metrics)

    ctx.add_shutdown_callback(lambda: logger.info(f"Usage: {session.usage}"))

    await session.start(
        agent=MyAgent(),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                # noise_cancellation=noise_cancellation.BVC(),  # optional
            ),
        ),
    )

if __name__ == "__main__":
    cli.run_app(server)
```

### Old Pattern (production reference — still works)

```python
from livekit.agents import cli, JobContext, JobProcess, WorkerOptions, AgentSession
from livekit.plugins import silero

async def entrypoint(ctx: JobContext):
    session = AgentSession(
        stt=..., llm=..., tts=...,
        vad=ctx.proc.userdata["vad"],
        turn_detection=MultilingualModel(),
        preemptive_generation=True,
    )
    await session.start(room=ctx.room, agent=Bot(), ...)

def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm))
```

---

## AgentSession — Key Parameters

```python
AgentSession(
    stt=...,                          # Speech-to-text model
    llm=...,                          # Language model
    tts=...,                          # Text-to-speech model
    vad=...,                          # Voice Activity Detection
    turn_detection=...,               # When to trigger LLM response
    turn_handling=TurnHandlingOptions(
        turn_detection=MultilingualModel(),
        interruption={
            "resume_false_interruption": True,
            "false_interruption_timeout": 1.0,
        },
    ),
    preemptive_generation=True,       # Generate response while user still speaking
    aec_warmup_duration=3.0,          # Blocks interruptions briefly for AEC calibration
    tts_text_transforms=[             # Pre-process text before TTS
        "filter_emoji",
        "filter_markdown",
        text_transforms.replace({"LiveKit": "<<ˈ|l|aɪ|v>> <<ˈ|k|ɪ|t>>"}),
    ],
    userdata={},                      # Shared data accessible from tools & events
)
```

---

## STT Models (available via `inference.STT`)

| Provider | Model | Notes |
|----------|-------|-------|
| Deepgram | `deepgram/nova-3` | Default, `language="multi"` for auto-detect |
| OpenAI | `openai/whisper-1` | Widely supported |
| Google | via `livekit-plugins-google` | Best for Vietnamese `vi-VN` |
| AssemblyAI | `assemblyai/...` | Good accuracy |

**For Vietnamese (vi-VN) — use Google STT plugin:**
```python
from livekit.plugins import google
stt = google.STT(
    languages=["vi-VN"],
    model="telephony",   # or "long" for longer utterances
    credentials_file="./credentials.json",  # local dev
    # credentials_info=json.loads(os.getenv("GOOGLE_CREDENTIALS_INFO")),  # AWS/prod
)
```

---

## LLM Models (available via `inference.LLM` or plugins)

```python
# Via LiveKit Inference (recommended — unified API)
llm = inference.LLM("openai/gpt-4.1-mini")
llm = inference.LLM("openai/gpt-4.1")
llm = inference.LLM("openai/gpt-5.2-chat-latest")  # latest

# Via OpenAI plugin directly (production reference pattern)
from livekit.plugins import openai
llm = openai.LLM(
    model="gpt-4o",
    tool_choice="auto",
    temperature=0.5,
    base_url=os.getenv("OPENAI_API_BASE_URL"),  # optional proxy
)

# Via Groq plugin (fast inference)
from livekit.plugins import groq
llm = groq.LLM(model="llama-3.3-70b-versatile", reasoning_effort="high")
```

---

## TTS Models

```python
# Via LiveKit Inference
tts = inference.TTS("cartesia/sonic-3", voice="9626c31c-bec5-4cca-baa8-f8ba9e84c8bc")

# Google Cloud TTS (best for Vietnamese)
from livekit.plugins import google
tts = google.TTS(
    gender="female",
    language="vi-VN",
    voice_name="vi-VN-Neural2-A",   # or "vi-VN-Neural2-C" (female)
    credentials_file="./credentials.json",
)

# ElevenLabs (low latency, natural)
from livekit.plugins import elevenlabs
tts = elevenlabs.TTS(
    model="eleven_flash_v2_5",
    voice_id="ogNNNeChcgBhHAgSoX0V",
    streaming_latency=0,
)

# Minimax (multilingual including Vietnamese)
from livekit.plugins import minimax
tts = minimax.TTS(
    model="speech-2.6-turbo",
    voice_id="...",
    language_boost="Vietnamese",
)
```

---

## VAD (Voice Activity Detection)

```python
# Must be preloaded in prewarm for performance
from livekit.plugins import silero

def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()

# Use in session
session = AgentSession(
    vad=ctx.proc.userdata["vad"],
    ...
)
```

---

## Turn Detection

```python
from livekit.plugins.turn_detector.multilingual import MultilingualModel
from livekit.plugins.turn_detector.english import EnglishModel

# For Vietnamese / multi-language
turn_detection = MultilingualModel()

# For English only
turn_detection = EnglishModel()

# New API (TurnHandlingOptions)
from livekit.agents import TurnHandlingOptions
turn_handling = TurnHandlingOptions(
    turn_detection=MultilingualModel(),
    interruption={
        "resume_false_interruption": True,    # handle background noise
        "false_interruption_timeout": 1.0,
    },
)
```

---

## Function Tools

### New style (decorator on Agent method)
```python
from livekit.agents.llm import function_tool
from livekit.agents import RunContext

class DriverAgent(Agent):
    @function_tool
    async def confirm_trip(self, context: RunContext, trip_id: str) -> str:
        """Confirm the driver's acceptance of a trip.
        
        Args:
            trip_id: The ID of the trip to confirm
        """
        # context.userdata contains session data
        driver_id = context.userdata.get("driver_id")
        # ... business logic
        await context.session.say("Chuyến đi đã được xác nhận!", allow_interruptions=False)
        return f"Trip {trip_id} confirmed for driver {driver_id}"

    @function_tool
    async def get_next_trip(self, context: RunContext) -> str:
        """Get the driver's next scheduled trip."""
        trips = context.userdata.get("upcoming_trips", [])
        if not trips:
            return "Không có chuyến xe nào trong lịch."
        next_trip = trips[0]
        return f"Chuyến tiếp theo: đón {next_trip['passenger_name']} lúc {next_trip['pickup_time']}"
```

### Old style (raw_schema — used in production reference)
```python
from livekit.agents import function_tool, RunContext

@function_tool(raw_schema=raw_schema["tool_name"])
async def tool_name(raw_arguments: dict, context: RunContext):
    param = raw_arguments.get("param_name")
    await context.session.say("Response text", allow_interruptions=False)
    return "result"

# tools_definition.py
raw_schema = {
    "tool_name": {
        "type": "function",
        "name": "tool_name",
        "description": "When and why to call this tool",
        "parameters": {
            "type": "object",
            "properties": {
                "param_name": {"type": "string", "description": "..."}
            },
            "required": ["param_name"]
        }
    }
}
```

### Built-in tools
```python
from livekit.agents.beta import EndCallTool
tools = [EndCallTool()]  # Lets LLM end the call
```

---

## Session Events

```python
@session.on("metrics_collected")
def on_metrics(ev: MetricsCollectedEvent):
    metrics.log_metrics(ev.metrics)

# Other events (from production reference):
session.on("error", handler)
session.on("conversation_item_added", handler)     # Any message added to conversation
session.on("function_tools_executed", handler)     # Tool was called
session.on("user_input_transcribed", handler)      # STT result (event.transcript, event.is_final)
session.on("close", handler)                       # Session ended
```

---

## Room Events

```python
ctx.room.on("participant_connected", handler)
ctx.room.on("participant_disconnected", handler)
ctx.room.on("track_subscribed", handler)
```

---

## Noise Cancellation

```python
from livekit.plugins import noise_cancellation

# BVC Telephony (for phone calls)
noise_cancellation.BVCTelephony()

# BVC (general)
noise_cancellation.BVC()

# Apply in RoomInputOptions (old API)
room_input = RoomInputOptions(noise_cancellation=noise_cancellation.BVCTelephony())

# Apply in room_options (new API)
room_options = room_io.RoomOptions(
    audio_input=room_io.AudioInputOptions(
        noise_cancellation=noise_cancellation.BVC()
    )
)
```

---

## Session Control

```python
# Agent speaks (non-interruptable)
await session.say("Xin chào!", allow_interruptions=False)

# Trigger LLM response
await session.generate_reply(instructions="greet the user")
# or old API:
session.generate_reply(instructions="greet the user")

# Send simulated user input to LLM (used by SilenceTracker)
await session.run(user_input="<speech_not_detected>")

# End session
ctx.shutdown(reason="Call completed")
```

---

## SIP / Telephony Integration

### Architecture: Phone Call → LiveKit Agent

```
Phone Call
    ↓
SIP Provider (Twilio / Telnyx / Plivo)
    ↓  SIP INVITE
LiveKit SIP Service
    ↓  Creates SIP Participant in Room
LiveKit Room
    ↓  Job dispatched to worker
Agent Worker (Python process)
    ↓  STT → LLM → TTS
Agent speaks back to caller via LiveKit → SIP → Phone
```

### Three core SIP components

1. **Inbound Trunk** — Accept calls from a SIP provider
2. **Outbound Trunk** — Make calls through a SIP provider  
3. **Dispatch Rule** — Route inbound calls to specific rooms / agent types

### Twilio SIP Trunk Setup (Inbound)

**In Twilio Console:**
1. Go to **Voice → SIP Trunks** → Create new trunk
2. Name: `livekit-inbound`
3. Origination URI: Leave empty (we receive calls)
4. Termination SIP Domain: `your-domain.pstn.twilio.com`
5. Under **Phone Numbers** → Add your purchased number to this trunk
6. Authentication: Add LiveKit's SIP server IPs to IP Access Control List

**LiveKit CLI — create Inbound Trunk:**
```bash
# Install LiveKit CLI
brew install livekit-cli

# Authenticate
lk cloud auth

# Create inbound trunk
lk sip inbound create \
  --name "driver-assistant-inbound" \
  --allowed-numbers "+84xxxxxxxxx" \
  --krisp-enabled true
```

**Via LiveKit API (Python):**
```python
from livekit import api

async def create_inbound_trunk():
    lk_api = api.LiveKitAPI(
        url=os.getenv("LIVEKIT_URL"),
        api_key=os.getenv("LIVEKIT_API_KEY"),
        api_secret=os.getenv("LIVEKIT_API_SECRET"),
    )
    trunk = await lk_api.sip.create_sip_inbound_trunk(
        api.CreateSIPInboundTrunkRequest(
            trunk=api.SIPInboundTrunkInfo(
                name="driver-assistant-inbound",
                allowed_numbers=["+84xxxxxxxxx"],
                krisp_enabled=True,
            )
        )
    )
    print(f"Trunk created: {trunk.sip_trunk_id}")
    await lk_api.aclose()
```

### Dispatch Rule — Route inbound calls to agent

```python
from livekit import api

async def create_dispatch_rule(trunk_id: str):
    lk_api = api.LiveKitAPI(...)
    rule = await lk_api.sip.create_sip_dispatch_rule(
        api.CreateSIPDispatchRuleRequest(
            rule=api.SIPDispatchRule(
                rule_direct=api.SIPDispatchRuleIndividual(
                    room_prefix="driver-",  # creates rooms like "driver-+84xxx..."
                    new_room_on_each_call=True,
                ),
                trunk_ids=[trunk_id],
                dispatch_rule_id="driver-assistant-dispatch",
            )
        )
    )
    await lk_api.aclose()
```

### Twilio SIP Trunk Setup (Outbound)

**In Twilio Console:**
1. Voice → SIP Trunks → Create trunk for outbound
2. Set Origination URI to LiveKit's SIP endpoint:
   `sip:your-region.sip.livekit.cloud`
3. Add credentials (username/password) for authentication

**LiveKit CLI — create Outbound Trunk:**
```bash
lk sip outbound create \
  --name "driver-assistant-outbound" \
  --address "your-twilio-domain.pstn.twilio.com" \
  --username "your-twilio-sip-username" \
  --password "your-twilio-sip-password"
```

### Making Outbound Calls (CreateSIPParticipant)

```python
from livekit import api

async def call_driver(phone_number: str, driver_id: str, trunk_id: str):
    lk_api = api.LiveKitAPI(
        url=os.getenv("LIVEKIT_URL"),
        api_key=os.getenv("LIVEKIT_API_KEY"),
        api_secret=os.getenv("LIVEKIT_API_SECRET"),
    )
    
    # This creates a SIP participant in a room and dials the phone number
    participant = await lk_api.sip.create_sip_participant(
        api.CreateSIPParticipantRequest(
            sip_trunk_id=trunk_id,
            sip_call_to=phone_number,           # "+84xxxxxxxxx"
            room_name=f"driver-outbound-{driver_id}",
            participant_identity=f"sip-{phone_number}",
            participant_name=f"Driver {driver_id}",
            participant_attributes={
                "driver_id": driver_id,
                "call_type": "outbound",
            },
            krisp_enabled=True,
        )
    )
    print(f"Outbound call initiated: {participant.participant_identity}")
    await lk_api.aclose()
    return participant
```

### Agent-side: Reading SIP Participant Attributes

```python
# In RoomEventHandlers.on_participant_connected_handler()
def on_participant_connected_handler(self, participant):
    attrs = participant.attributes or {}
    driver_id = attrs.get("driver_id")
    call_type = attrs.get("call_type", "inbound")
    
    # Amazon Connect uses "x-connect-contact-id"
    # Custom SIP uses whatever attributes you set in CreateSIPParticipant
    self.session.userdata["driver_id"] = driver_id
    self.session.userdata["call_type"] = call_type
```

### Ending a Call / Removing SIP Participant

```python
from livekit import api
from livekit.protocol.room import RoomParticipantIdentity

async def end_call(room_name: str, participant_identity: str):
    lk_api = api.LiveKitAPI(
        url=os.getenv("LIVEKIT_URL"),
        api_key=os.getenv("LIVEKIT_API_KEY"),
        api_secret=os.getenv("LIVEKIT_API_SECRET"),
    )
    await lk_api.room.remove_participant(
        RoomParticipantIdentity(
            room=room_name,
            identity=participant_identity
        )
    )
    await asyncio.sleep(0.5)
    await lk_api.aclose()
```

---

## Twilio Approach: Two Options

### Option A: Twilio + LiveKit SIP (Recommended for production)
- Twilio SIP trunk → LiveKit SIP service → LiveKit agent
- Full real-time streaming, lowest latency
- Requires SIP trunk configuration in both Twilio and LiveKit

### Option B: Twilio Programmable Voice + TwiML (Simpler for prototype)
- Twilio webhook → FastAPI → TwiML response
- No LiveKit needed for basic call handling
- Use Twilio `<Stream>` to send audio to LiveKit WebSocket for AI processing
- Higher latency than pure SIP

```python
# TwiML to stream audio to a WebSocket (connects Twilio audio to LiveKit pipeline)
from twilio.twiml.voice_response import VoiceResponse, Connect, Stream

response = VoiceResponse()
connect = Connect()
connect.stream(url=f"wss://your-backend/api/v1/calls/media-stream/{call_sid}")
response.append(connect)
```

---

## Telephony Agent Pattern (DTMF Example)

```python
from livekit.agents import Agent, AgentServer, AgentSession, JobContext, JobProcess, RunContext, cli
from livekit.agents.llm import function_tool
from livekit.plugins import silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel
import os

class TelephonyAgent(Agent):
    def __init__(self):
        super().__init__(
            instructions="""You are a driver assistant voicebot.
            Speak Vietnamese. Keep responses very short (under 20 words).
            Do not use any symbols or markdown.""",
        )

    async def on_enter(self):
        await self.session.say("Xin chào tài xế! Tôi có thể giúp gì cho bạn?",
                               allow_interruptions=False)

    @function_tool
    async def confirm_trip(self, context: RunContext, trip_id: str) -> str:
        """Xác nhận chuyến xe của tài xế.
        Args:
            trip_id: Mã chuyến xe cần xác nhận
        """
        # Update DB, notify system
        return f"Đã xác nhận chuyến {trip_id}"

server = AgentServer()

def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()

server.setup_fnc = prewarm

@server.rtc_session(agent_name=os.getenv("LIVEKIT_AGENT_NAME", "driver-assistant"))
async def entrypoint(ctx: JobContext):
    from livekit.plugins import google
    session = AgentSession(
        stt=google.STT(languages=["vi-VN"], model="telephony",
                       credentials_file=os.getenv("GOOGLE_CREDENTIALS_INFO")),
        llm=...,   # openai.LLM or inference.LLM
        tts=google.TTS(language="vi-VN", voice_name="vi-VN-Neural2-A",
                       credentials_file=os.getenv("GOOGLE_CREDENTIALS_INFO")),
        vad=ctx.proc.userdata["vad"],
        turn_handling=TurnHandlingOptions(turn_detection=MultilingualModel()),
        preemptive_generation=True,
    )
    await session.start(agent=TelephonyAgent(), room=ctx.room)

if __name__ == "__main__":
    cli.run_app(server)
```

---

## Environment Variables for LiveKit

```bash
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# Google STT/TTS
GOOGLE_CREDENTIALS_INFO=./credentials.json     # local path
# OR base64/JSON string for production

# OpenAI
OPENAI_API_KEY=sk-...

# Silero VAD model auto-downloaded via `python app.py download-files`
```

---

## CLI Commands

```bash
# Install
brew install livekit-cli
pip install livekit-agents livekit-plugins-google livekit-plugins-openai \
    livekit-plugins-silero livekit-plugins-turn-detector \
    livekit-plugins-noise-cancellation livekit-plugins-elevenlabs

# Auth
lk cloud auth

# Download model files (Silero VAD etc.) — run once
python app.py download-files

# Run agent (dev mode — connects to LiveKit Cloud)
python app.py dev

# Run agent (production)
python app.py start

# Create agent on LiveKit Cloud (deploy)
lk agent create

# SIP management
lk sip inbound list
lk sip outbound list
lk sip dispatch list
```

---

## Dockerfile (LiveKit Agent)

```dockerfile
FROM python:3.13.5-slim

RUN apt-get update && apt-get install -y gcc python3-dev && rm -rf /var/lib/apt/lists/*

ARG UID=10001
RUN adduser --disabled-password --gecos "" --home "/home/appuser" \
    --shell "/sbin/nologin" --uid "${UID}" appuser
USER appuser
WORKDIR /home/appuser

COPY requirements.txt .
RUN python -m pip install --user --no-cache-dir -r requirements.txt

COPY . .

# Pre-download model files (Silero VAD, turn detection models)
RUN python app.py download-files

EXPOSE 8081
CMD ["python", "app.py", "start"]
```

---

## Key Differences: Production Reference vs Latest API

| Feature | Production Reference (1.2.11) | Latest GitHub |
|---------|-------------------------------|---------------|
| Entry point | `WorkerOptions(entrypoint_fnc=...)` | `AgentServer()` + `@server.rtc_session()` |
| Session start | `session.start(room=..., agent=..., room_input_options=..., room_output_options=...)` | `session.start(agent=..., room=..., room_options=...)` |
| Turn detection | `turn_detection=MultilingualModel()` (direct param) | `TurnHandlingOptions(turn_detection=MultilingualModel())` |
| Tools | `@function_tool(raw_schema=...)` (standalone function) | `@function_tool` (method on Agent class) |
| Greeting | `on_enter()` calls `await session.say(...)` | `on_enter()` calls `session.generate_reply(...)` |
| Plugins | `livekit.plugins.openai`, `livekit.plugins.google` | `inference.STT(...)`, `inference.LLM(...)`, `inference.TTS(...)` |

**Recommendation for this project:** Use the **production reference pattern** as the base (already battle-tested), but adopt `@function_tool` as method decorator style from the new API since it's cleaner.

---

## SIP Supported Providers

Tested by LiveKit:
- **Twilio** ✅
- Telnyx ✅
- Plivo ✅
- Exotel ✅
- Wavix ✅

Supported SIP features:
- SIP over UDP / TCP / TLS
- DTMF (RFC 2833 / 4733)
- Cold & warm call transfers
- Caller ID
- RTP + SRTP (encrypted audio)
- SIP OPTIONS (keepalive)

Not supported:
- SIP Registration (REGISTER)
- SIPRECT
- Video over SIP
- REFER in TLS mode

---

## Step 1 Decision: Which Twilio Approach?

For the Driver Assistant:

**Phase 1 (prototype):** Use **Twilio Programmable Voice + TwiML** (simpler, no SIP config needed)
- Webhook → FastAPI → TwiML
- Can use `<Stream>` to pipe audio to WebSocket for AI processing later

**Phase 2 (full system):** Migrate to **Twilio SIP Trunk → LiveKit SIP** for proper real-time streaming
- Full duplex, <1.5s latency
- Proper AI voicebot via LiveKit Agent
