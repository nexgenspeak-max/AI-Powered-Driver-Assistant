# voice-agent

Python worker that runs a Vietnamese AI voice assistant. When a driver calls `+19068288788`, Twilio routes the call to LiveKit SIP, which dispatches it to this agent. The agent listens, thinks, and speaks back in real-time.

## Stack

- Python · livekit-agents 1.5.9
- STT: OpenAI Whisper (`whisper-1`) or Deepgram Nova-2
- LLM: OpenAI GPT-4o-mini
- TTS: ElevenLabs Flash v2.5
- Deployed as: AWS ECS Fargate

---

## Run locally

### 1. Install dependencies

```bash
cd src/backend/voice-agent
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Download model files (one-time)

```bash
python -m app.main download-files
```

> This downloads the Silero VAD and turn-detector models (~50 MB). Must be done before the first run.

### 3. Create env file

`envs/.env.local` (copy values from your API dashboards):

```env
# LiveKit — from cloud.livekit.io → Project Settings
LIVEKIT_URL=wss://ai-powered-driver-assistant-77jfa364.livekit.cloud
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# ElevenLabs
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB
ELEVENLABS_MODEL=eleven_flash_v2_5

# Deepgram (optional — only if STT_PROVIDER=deepgram)
DEEPGRAM_API_KEY=

# Twilio
TWILIO_PHONE_NUMBER=+19068288788

# Providers
STT_PROVIDER=openai        # openai | deepgram | google
LLM_PROVIDER=openai
TTS_PROVIDER=elevenlabs

ENV=local
```

### 4. Start the agent

```bash
python -m app.main dev
```

The agent connects to LiveKit Cloud and waits for calls. It's ready when you see:

```
INFO  livekit.agents  registered worker  {"agent_name": "", "id": "AW_..."}
```

---

## Test without a phone (browser)

```bash
python test_server.py
```

Open [http://localhost:8888](http://localhost:8888) → click **Connect** → speak into your mic.  
The agent joins the room and responds in Vietnamese.

---

## Test with a real phone call

1. Agent must be running (`python -m app.main dev`)
2. Call **+1 906 828 8788** from any phone
3. After ~3 s you should hear: *"Xin chào! Tôi là trợ lý AI của bạn..."*

Expected log output:
```
INFO  received job request  {"room": "driver-call-_+84867347452_..."}
INFO  connected to room: driver-call-_+84867347452_...
INFO  session started
```

---

## Switch STT/LLM/TTS provider

Change `STT_PROVIDER` / `LLM_PROVIDER` / `TTS_PROVIDER` in `.env.local`:

| Variable | Options |
|---|---|
| `STT_PROVIDER` | `openai` (Whisper) · `deepgram` (Nova-2) · `google` |
| `LLM_PROVIDER` | `openai` (GPT-4o-mini) · `google` (Gemini) |
| `TTS_PROVIDER` | `elevenlabs` · `openai` · `google` |

---

## LiveKit SIP setup (one-time)

If the SIP trunk or dispatch rule doesn't exist yet:

```bash
python scripts/setup_sip.py
```

This creates the inbound SIP trunk (`ST_65EBPmZTeo3b`) and dispatch rule (`SDR_rLQY2QxSoQeU`) in your LiveKit project.

> See `claude/voice-agent/setup.md` for the full setup guide including Twilio SIP trunk configuration.

---

## Deploy to AWS

```bash
# Fill in src/voice-agent/envs/.env.dev (API keys + VPC_ID + SUBNET_IDS)
bash infra/voice-agent/deploy.sh dev

# Watch logs
aws logs tail /ecs/dev-driver-assistant-voice-agent --follow --profile david --region ap-southeast-1

# Teardown
bash infra/voice-agent/teardown.sh dev
```

> See `claude/voice-agent/deploy.md` for the full deployment guide and cost breakdown.

---

## Project structure

```
src/voice-agent/
├── app/
│   ├── main.py          # WorkerOptions + CLI entry point
│   ├── agent.py         # DriverAgent class, tools, entrypoint
│   ├── providers.py     # STT / LLM / TTS factory
│   └── config.py        # Pydantic settings
├── scripts/
│   └── setup_sip.py     # One-time LiveKit SIP trunk + dispatch rule
├── envs/
│   ├── .env.local       # Local secrets (not in git)
│   └── .env.dev         # Dev/AWS secrets (not in git)
├── test_server.py       # Browser test server (port 8888)
├── test_client.html     # Browser mic test UI
├── Dockerfile
└── requirements.txt
```
