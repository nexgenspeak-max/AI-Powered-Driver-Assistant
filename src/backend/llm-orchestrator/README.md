# llm-orchestrator

Python worker that runs a Vietnamese AI voice assistant. When a driver calls `+19068288788`, Twilio routes the call to LiveKit SIP, which dispatches it to this agent. The agent listens, thinks, and speaks back in real-time.

## Stack

- Python · livekit-agents 1.5.9
- STT: OpenAI Whisper (`whisper-1`) or Deepgram Nova-2
- LLM: OpenAI gpt-5.6-luna
- TTS: ElevenLabs Flash v2.5
- Deployed as: AWS ECS Fargate

---

## Run locally

### 1. Install dependencies

```bash
cd src/backend/llm-orchestrator
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Download model files (one-time)

```bash
python -m app.main download-files
```

> This downloads the Silero VAD and turn-detector models (~50 MB). Must be done before the first run.

### 3. Keys and config

Secrets go in `envs/.env.local` (copy `envs/.env.example`). Providers, models, URLs, and voices go in `envs/config.local.toml` (copy `envs/config.example.toml`). A value set in the shell or in `.env.local` overrides the toml file.

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

Change `stt_provider`, `llm_provider`, and `tts_provider` in `envs/config.local.toml`. Optional `stt_fallback`, `llm_fallback`, and `tts_fallback` are comma-separated backups used only when the provider in front fails. Leave them empty to keep a single provider. A backup uses its own default model and voice.

| Field | Options |
|---|---|
| `stt_provider` | `openai` (Whisper) · `deepgram` (Nova-2) · `google` · `inference` |
| `llm_provider` | `openai` (gpt-5.6-luna) · `gemini` · `kimi` |
| `tts_provider` | `google` · `elevenlabs` · `openai` · `gemini` |

---

## LiveKit SIP setup (one-time)

If the SIP trunk or dispatch rule doesn't exist yet:

```bash
python scripts/setup_sip.py
```

This creates the inbound SIP trunk (`ST_65EBPmZTeo3b`) and dispatch rule (`SDR_rLQY2QxSoQeU`) in your LiveKit project.

> See `claude/llm-orchestrator/setup.md` for the full setup guide including Twilio SIP trunk configuration.

---

## Deploy to AWS

```bash
# Fill in src/backend/llm-orchestrator/envs/.env.dev (API keys + VPC_ID + SUBNET_IDS)
bash infra/llm-orchestrator/deploy.sh dev

# Watch logs
aws logs tail /ecs/dev-driver-assistant-voice-agent --follow --profile david --region ap-southeast-1

# Teardown
bash infra/llm-orchestrator/teardown.sh dev
```

> See `claude/llm-orchestrator/deploy.md` for the full deployment guide and cost breakdown.

---

## Driver support requirements

FAQ catalog, conversation flows, and tool/backend coverage — see `requirements/README.md`.

**RAG playbook:** edit `requirements/knowledge/vi/` or `en/`, then:

```bash
ENV=local python scripts/build_faq_index.py        # both languages
ENV=local python scripts/build_faq_index.py --lang vi
```

Tool: `answer_app_faq` — handles *"ứng dụng hỗ trợ những gì?"*, how-to, user guide questions.

---

## Project structure

Worker entry is `app/main.py`. Session and tools live under `app/agent/`, `app/voicebot/`, and `app/providers/`. Env files are in `envs/`.
