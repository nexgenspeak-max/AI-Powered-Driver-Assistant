# Voice Agent — Setup & Troubleshooting Guide

Complete reference for the AI-Powered Driver Assistant SIP → LiveKit → Agent pipeline.

---

## 1. Architecture

```
Driver's phone
  → Twilio (+19068288788, Elastic SIP Trunk)
  → LiveKit SIP endpoint  sip:5on4wixbq.sip.livekit.cloud;transport=tls
  → LiveKit Room  driver-call-_<caller>_<id>
  → Agent Worker  (Python, livekit-agents 1.5.9)
       STT  Deepgram Nova-2  (language: vi)
       LLM  OpenAI GPT-4o
       TTS  ElevenLabs (Vietnamese voice)
  → Audio back to driver's phone
```

Key directories:

| Path | Role |
|---|---|
| `src/voice-agent/` | Python agent worker |
| `src/call-center/` | FastAPI service (Twilio recording webhooks — not in SIP path) |
| `scripts/setup_sip.py` | One-time LiveKit SIP trunk + dispatch rule creation |

---

## 2. Prerequisites

### 2.1 LiveKit Cloud

1. Create account → new project (e.g. `ai-powered-driver-assistant`)
2. Project Settings → copy:
   - `LIVEKIT_URL` — `wss://ai-powered-driver-assistant-77jfa364.livekit.cloud`
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
3. Project Settings → **SIP URI** field → copy the short SIP hostname:

```
sip:5on4wixbq.sip.livekit.cloud
```

> ⚠️ **Do NOT use the project URL** (`ai-powered-driver-assistant-77jfa364.sip.livekit.cloud`).
> The SIP URI is a separate short hostname shown in the SIP URI field on the dashboard.

### 2.2 OpenAI

- Generate API key → `OPENAI_API_KEY`

### 2.3 ElevenLabs

- Generate API key → `ELEVENLABS_API_KEY`
- Pick a Vietnamese voice → copy Voice ID → `ELEVENLABS_VOICE_ID`

> ⚠️ The `livekit-plugins-elevenlabs` plugin reads `ELEVEN_API_KEY`, **not** `ELEVENLABS_API_KEY`.
> Always pass `api_key=` explicitly in `providers.py`:
> ```python
> return elevenlabs.TTS(
>     api_key=s.elevenlabs_api_key,   # ← must be explicit
>     model=s.elevenlabs_model,
>     voice_id=s.elevenlabs_voice_id,
> )
> ```

### 2.4 Deepgram

- Generate API key → `DEEPGRAM_API_KEY`

### 2.5 Twilio

- Buy a US phone number (e.g. `+19068288788`)
- SIP Trunk configuration is covered in Step 6

---

## 3. Environment File

Create `src/voice-agent/envs/.env.local`:

```env
# LiveKit
LIVEKIT_URL=wss://ai-powered-driver-assistant-77jfa364.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxx

# OpenAI
OPENAI_API_KEY=sk-...

# Deepgram
DEEPGRAM_API_KEY=...

# ElevenLabs
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
ELEVENLABS_MODEL=eleven_multilingual_v2

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_PHONE_NUMBER=+19068288788

# Providers
STT_PROVIDER=deepgram
LLM_PROVIDER=openai
TTS_PROVIDER=elevenlabs
```

---

## 4. Install & Download Models

From `src/voice-agent/`:

```bash
# Create virtualenv
python -m venv .venv && source .venv/bin/activate

# Install packages
pip install -r requirements.txt

# Download VAD + turn-detector model files (one-time, ~50 MB)
python -m app.main download-files
```

> ⚠️ **`download-files` is mandatory before the first run.**
> Skipping it causes `model_q8.onnx not found` at runtime.

---

## 5. LiveKit SIP Setup (one-time)

```bash
python scripts/setup_sip.py
```

This creates:
- **SIP Inbound Trunk** `ST_65EBPmZTeo3b` — maps `+19068288788` to LiveKit
- **Dispatch Rule** `SDR_rLQY2QxSoQeU` — per call creates `driver-call-<caller>-<id>` room and dispatches the agent

> ⚠️ The dispatch rule **must** include `room_config` with an agent dispatch entry.
> Without it the agent never receives SIP jobs.

Verify:

```bash
python -c "
from dotenv import load_dotenv; load_dotenv('envs/.env.local')
import asyncio, os
from livekit import api

async def check():
    lk = api.LiveKitAPI(os.getenv('LIVEKIT_URL'), os.getenv('LIVEKIT_API_KEY'), os.getenv('LIVEKIT_API_SECRET'))
    trunks = await lk.sip.list_inbound_trunk(api.ListSIPInboundTrunkRequest())
    for t in trunks.items:
        print('Trunk:', t.sip_trunk_id, list(t.numbers))
    rules = await lk.sip.list_dispatch_rule(api.ListSIPDispatchRuleRequest())
    for r in rules.items:
        print('Rule:', r.sip_dispatch_rule_id)
        print('  agents count:', len(r.room_config.agents))
    await lk.aclose()

asyncio.run(check())
"
```

Expected output:
```
Trunk: ST_65EBPmZTeo3b ['+19068288788']
Rule: SDR_rLQY2QxSoQeU
  agents count: 1
```

---

## 6. Twilio SIP Trunk Configuration

### 6.1 Create the Trunk

1. Twilio Console → **Elastic SIP Trunking** → Trunks → Create
2. Give it a name (e.g. `LiveKit Driver Agent`)
3. Under **Origination**, add Origination URI:

```
sip:5on4wixbq.sip.livekit.cloud;transport=tls
```

> ⚠️ `transport=tls` is **required**.
> LiveKit SIP only responds on TLS port 5061. TCP port 5060 gets no response.

4. Leave Priority = 10, Weight = 10 → Save

### 6.2 Assign Your Phone Number

1. Same trunk → **Numbers** tab → Add a Number
2. Select `+19068288788` → Save

### 6.3 Configure the Number

1. Twilio Console → Phone Numbers → Manage → your number
2. Under **Voice & Fax** → set "Configure with" = **SIP Trunk**
3. Select your trunk → Save

---

## 7. Running the Agent

From `src/voice-agent/`:

```bash
# Development — auto-reloads on file changes
python -m app.main dev

# Capture logs to file
python -m app.main dev 2>&1 | tee /tmp/voice-agent.log

# Production
python -m app.main start
```

The agent is ready when you see:

```
INFO  livekit.agents  registered worker  {"agent_name": "", "id": "AW_...", "url": "wss://...livekit.cloud"}
```

---

## 8. Testing

### 8.1 Browser test (no phone)

```bash
python test_server.py
# Open http://localhost:8888
```

Click Connect → speak → hear Vietnamese response from agent.

### 8.2 Real phone call

1. Agent running (`python -m app.main dev`)
2. Call **+1 906 828 8788** from any phone
3. After ~3 s: hear `"Xin chào! Tôi là trợ lý AI của bạn..."`

Expected logs:

```
INFO  received job request  {"room": "driver-call-_+84867347452_..."}
INFO  connected to room: driver-call-_+84867347452_...
INFO  session started
```

### 8.3 SIP connectivity check

Verify LiveKit SIP TLS is reachable:

```bash
printf "OPTIONS sip:+19068288788@5on4wixbq.sip.livekit.cloud SIP/2.0\r\n\
Via: SIP/2.0/TLS 127.0.0.1:5061;branch=z9hG4bK-test\r\n\
From: <sip:test@127.0.0.1>;tag=test123\r\n\
To: <sip:+19068288788@5on4wixbq.sip.livekit.cloud>\r\n\
Call-ID: test@127.0.0.1\r\nCSeq: 1 OPTIONS\r\n\
Max-Forwards: 70\r\nContent-Length: 0\r\n\r\n" \
  | openssl s_client -connect 5on4wixbq.sip.livekit.cloud:5061 -quiet 2>/dev/null
```

Expected: `SIP/2.0 200 OK`

---

## 9. Troubleshooting

### `model_q8.onnx not found`

**Cause:** VAD/turn-detector model files not downloaded.  
**Fix:**
```bash
python -m app.main download-files
```

---

### `AgentSession has no attribute 'wait_for_disconnect'`

**Cause:** Method does not exist in livekit-agents 1.5.9.  
**Fix:** Use `asyncio.Event` + room `disconnected` event:

```python
disconnected = asyncio.Event()
ctx.room.on("disconnected", lambda: disconnected.set())
if ctx.room.connection_state != 3:
    await disconnected.wait()
```

---

### `AttributeError: 'int' object has no attribute 'value'` on `connection_state`

**Cause:** `ctx.room.connection_state` is already an `int`, not an enum.  
**Fix:** Remove `.value`:

```python
# Wrong
if ctx.room.connection_state.value != 3:

# Correct
if ctx.room.connection_state != 3:
```

---

### ElevenLabs API key not found

**Cause:** Plugin reads `ELEVEN_API_KEY`, not `ELEVENLABS_API_KEY`.  
**Fix:** Pass `api_key=` explicitly in `providers.py`:

```python
return elevenlabs.TTS(
    api_key=s.elevenlabs_api_key,
    model=s.elevenlabs_model,
    voice_id=s.elevenlabs_voice_id,
)
```

---

### `with_ttl` TypeError: expected timedelta, not int

**Cause:** `AccessToken.with_ttl()` requires a `timedelta`, not an integer.  
**Fix:**

```python
from datetime import timedelta
token.with_ttl(timedelta(hours=1))
```

---

### Twilio: SIP call status = **Failed** (no SIP response at all)

**Cause:** Wrong SIP URI or `transport=tcp` used.  
**Fix:** Use correct URI with TLS:

```
sip:5on4wixbq.sip.livekit.cloud;transport=tls
```

---

### Twilio: SIP call status = **No Answer**

This means LiveKit receives the call but the agent isn't answering. Check in order:

1. Is the agent running? Look for `registered worker` in logs.
2. Check the child process has a network connection to LiveKit:
   ```bash
   ps aux | grep "multiprocessing-fork"   # find child PIDs
   lsof -p <child_pid> | grep ESTABLISHED
   ```
3. Check dispatch rule has `room_config.agents` (run the verify command in Step 5).

---

### Dispatch rule not triggering agent

**Cause:** Dispatch rule created without `room_config`.  
**Fix:** Delete the old rule and recreate with:

```python
rule = api.CreateSIPDispatchRuleRequest(
    trunk_ids=[trunk_id],
    name="driver-assistant-dispatch",
    rule=api.SIPDispatchRule(
        dispatch_rule_individual=api.SIPDispatchRuleIndividual(
            room_prefix="driver-call-",
        ),
    ),
    room_config=api.RoomConfiguration(
        agents=[api.RoomAgentDispatch(agent_name="")]
    ),
)
```

---

### Wrong LiveKit SIP hostname used

The SIP endpoint is **not** derived from the project URL.

| ❌ Wrong | `ai-powered-driver-assistant-77jfa364.sip.livekit.cloud` |
|---|---|
| ✅ Correct | `5on4wixbq.sip.livekit.cloud` |

Find the correct one: LiveKit Cloud → Project Settings → **SIP URI** field.

---

## 10. Key Files

| File | Purpose |
|---|---|
| `app/agent.py` | `DriverAgent` class, tools, `entrypoint` |
| `app/providers.py` | STT / LLM / TTS factory |
| `app/main.py` | `WorkerOptions`, CLI entry point |
| `app/config.py` | Pydantic settings, reads `.env` |
| `scripts/setup_sip.py` | One-time SIP trunk + dispatch rule |
| `test_server.py` | Local browser test server (port 8888) |
| `test_client.html` | Browser mic test UI |
| `envs/.env.local` | Local secrets (not in git) |

---

## 11. Quick-Start Checklist (fresh machine)

- [ ] Clone repo, `cd src/voice-agent`
- [ ] `pip install -r requirements.txt`
- [ ] `python -m app.main download-files`
- [ ] Fill in `envs/.env.local` with all API keys
- [ ] `python scripts/setup_sip.py`  *(one-time)*
- [ ] Twilio Trunk → Origination URI = `sip:5on4wixbq.sip.livekit.cloud;transport=tls`
- [ ] Twilio Trunk → Numbers → add `+19068288788`
- [ ] Twilio Number → Voice config → SIP Trunk
- [ ] `python -m app.main dev`
- [ ] Wait for `registered worker` in logs
- [ ] Call `+19068288788` → hear Vietnamese greeting ✅
