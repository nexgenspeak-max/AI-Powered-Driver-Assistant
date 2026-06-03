# Local Setup Guide — AI Driver Assistant (Đồ án tốt nghiệp)

Step-by-step guide for a **new developer** cloning this repo and running the full stack locally.

**Last updated:** 2026-05-24

---

## 1. What You Are Setting Up

```
┌─────────────────────────────────────────────────────────────┐
│  Frontends                                                  │
│  • driver-app (Expo RN) — driver mobile + voice assistant   │
│  • customer-app (Expo RN) — customer booking                │
│  • admin-panel (React Vite) — trip board + drivers          │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / LiveKit
┌──────────────────────────▼──────────────────────────────────┐
│  Backends (FastAPI + Python worker)                         │
│  • trip-service    :8002  — trips, drivers, LiveKit token   │
│  • voice-agent     worker — STT → LLM → TTS (LiveKit Cloud) │
│  • call-logger     :8001  — call records (optional)         │
│  • call-center     :8000  — Twilio webhooks (optional)      │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  External services                                          │
│  LiveKit Cloud · OpenAI · ElevenLabs · AWS DynamoDB         │
│  Google Maps (optional) · Twilio (optional)                 │
└─────────────────────────────────────────────────────────────┘
```

**Minimum to test driver voice on iPhone:** trip-service + voice-agent + driver-app + Metro.

---

## 2. Prerequisites

### Required software


| Tool          | Version                 | Purpose                                        |
| ------------- | ----------------------- | ---------------------------------------------- |
| **Node.js**   | ≥ 18 (recommend 20 LTS) | Frontends, Expo, Metro                         |
| **Python**    | ≥ 3.11 (3.13 tested)    | All backends + voice-agent                     |
| **Xcode**     | Latest (macOS only)     | Build driver-app on real iPhone                |
| **CocoaPods** | Latest                  | iOS native deps (`pod install`)                |
| **AWS CLI**   | v2                      | DynamoDB tables for trip-service / call-logger |
| **Git**       | —                       | Clone repo                                     |


Optional but useful:

```bash
brew install ios-deploy   # deploy .app to physical iPhone from CLI
```

### Required accounts & API keys

Ask project owner or create your own:


| Service               | Keys needed                                            | Used by                                |
| --------------------- | ------------------------------------------------------ | -------------------------------------- |
| **LiveKit Cloud**     | `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | trip-service, voice-agent, mobile apps |
| **OpenAI**            | `OPENAI_API_KEY`                                       | voice-agent (STT + LLM)                |
| **ElevenLabs**        | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`            | voice-agent (TTS)                      |
| **AWS**               | Profile with DynamoDB access                           | trip-service, call-logger              |
| **Google Maps**       | `GOOGLE_MAPS_API_KEY` (optional)                       | trip-service route ETA                 |
| **Twilio** (optional) | Account SID, Auth Token, phone number                  | call-center, outbound SIP              |


### Apple Developer (physical iPhone only)

- Free Apple ID works for personal device testing
- Enable **Developer Mode** on iPhone: Settings → Privacy & Security → Developer Mode

---

## 3. Clone Repository

```bash
git clone <REPO_URL> doantotnghiep
cd doantotnghiep
```

### Repo layout

```
doantotnghiep/
├── claude/                          # Docs, working logs, setup guides
├── infra/                           # AWS SAM / CloudFormation deploy scripts
├── src/
│   ├── backend/
│   │   ├── trip-service/            # FastAPI :8002
│   │   ├── voice-agent/             # LiveKit Python worker
│   │   ├── call-logger/             # FastAPI :8001
│   │   └── call-center/             # FastAPI :8000
│   └── frontend/
│       ├── mobile-app/driver-app/   # Expo — driver
│       ├── customer-app/            # Expo — customer
│       └── admin-panel/             # React admin dashboard
```

---

## 4. Environment Files

Each service uses `envs/.env.local` for local dev (not committed to git). Copy from `.env.example` where available.

### 4.1 voice-agent

```bash
cd src/backend/voice-agent
cp envs/.env.example envs/.env.local   # if example exists, else create manually
```

`envs/.env.local` — fill in:

```env
LIVEKIT_URL=wss://<your-project>.livekit.cloud
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

# IMPORTANT for local dev — avoids cloud worker stealing jobs
AGENT_NAME=driver-assistant-local

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB
ELEVENLABS_MODEL=eleven_flash_v2_5

STT_PROVIDER=openai
LLM_PROVIDER=openai
TTS_PROVIDER=elevenlabs

TRIP_SERVICE_URL=http://localhost:8002
CALL_LOGGER_URL=http://localhost:8001

ENV=local
```

Install + download models (one-time):

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
ENV=local python -m app.main download-files   # ~50 MB, mandatory first time
```

### 4.2 trip-service

Create `src/backend/trip-service/envs/.env.local`:

```env
LIVEKIT_URL=wss://<your-project>.livekit.cloud
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

# Must match voice-agent AGENT_NAME
LIVEKIT_AGENT_NAME=driver-assistant-local

GOOGLE_MAPS_API_KEY=          # optional
AWS_PROFILE=david             # or your AWS profile name
AWS_REGION=ap-southeast-1
DYNAMODB_TRIPS_TABLE=local-driver-assistant-trips
```

Create DynamoDB table (one-time — see `src/backend/trip-service/README.md` for full `aws dynamodb create-table` command).

```bash
cd src/backend/trip-service
pip install -r requirements.txt
```

### 4.3 call-logger (optional)

```bash
cd src/backend/call-logger
pip install -r requirements.txt
# Create DynamoDB table — see README
```

### 4.4 call-center (optional — Twilio)

```bash
cd src/backend/call-center
cp envs/.env.example envs/.env.local
pip install -r requirements.txt
```

### 4.5 driver-app

```bash
cd src/frontend/mobile-app/driver-app
cp .env.example .env
npm install
```

Edit `.env`:

```env
# Simulator / same machine:
EXPO_PUBLIC_TRIP_SERVICE_URL=http://localhost:8002

# Physical iPhone on same Wi‑Fi — use Mac LAN IP:
# EXPO_PUBLIC_TRIP_SERVICE_URL=http://192.168.x.x:8002

EXPO_PUBLIC_LIVEKIT_URL=wss://<your-project>.livekit.cloud
```

Get Mac IP: `ipconfig getifaddr en0`

### 4.6 admin-panel

```bash
cd src/frontend/admin-panel
cp envs/.env.example envs/.env.local
npm install
```

### 4.7 customer-app

```bash
cd src/frontend/customer-app
npm install
```

---

## 5. Start Backend Services

Open **separate terminals** for each service.

### Terminal 1 — trip-service (required)

```bash
cd src/backend/trip-service
source .venv/bin/activate   # if using venv
AWS_PROFILE=david uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
```

> ⚠️ `**--host 0.0.0.0` is mandatory** when testing from a physical phone on the same Wi‑Fi.

Verify:

```bash
curl http://localhost:8002/health
# → {"status":"ok"} or similar
```

### Terminal 2 — voice-agent (required for voice)

```bash
cd src/backend/voice-agent
source .venv/bin/activate
ENV=local python -m app.main dev
```

Wait for:

```
registered worker {"agent_name": "driver-assistant-local", ...}
```

### Terminal 3 — call-logger (optional)

```bash
cd src/backend/call-logger
AWS_PROFILE=david uvicorn app.main:app --reload --port 8001
```

### Terminal 4 — call-center (optional)

```bash
cd src/backend/call-center
uvicorn app.main:app --reload --port 8000
# + ngrok http 8000 for Twilio webhooks
```

---

## 6. Start Frontends

### 6.1 Admin panel

```bash
cd src/frontend/admin-panel
npm run dev
# Open http://localhost:5173 (or port shown in terminal)
```

### 6.2 Driver app — iOS Simulator (easiest)

```bash
cd src/frontend/mobile-app/driver-app
npx expo start
# Press `i` for iOS Simulator
```

Simulator can use `localhost:8002` in `.env`.

### 6.3 Driver app — Physical iPhone (full voice test)

**One-time native build:**

```bash
cd src/frontend/mobile-app/driver-app
npm install
npx expo prebuild --platform ios   # if ios/ folder missing

# Set Node path for Xcode (if build script fails)
echo 'export NODE_BINARY=$(which node)' > ios/.xcode.env.local

# Open Xcode
open ios/DriverApp.xcworkspace
```

In Xcode:

1. Select your **Apple Team** (Signing & Capabilities → Automatic)
2. Select your **iPhone** as destination
3. Click **Run ▶** (build + install)

**Or via CLI** (see `claude/driver-app/working.md` for full bug history):

```bash
cd ios
xcodebuild -workspace DriverApp.xcworkspace -scheme DriverApp \
  -configuration Debug -destination 'id=<YOUR_DEVICE_UDID>' \
  -allowProvisioningUpdates build

ios-deploy --id <YOUR_DEVICE_UDID> \
  --bundle ~/Library/Developer/Xcode/DerivedData/DriverApp-*/Build/Products/Debug-iphoneos/DriverApp.app
```

**Every dev session — Metro bundler:**

```bash
cd src/frontend/mobile-app/driver-app
REACT_NATIVE_PACKAGER_HOSTNAME=$(ipconfig getifaddr en0) npx expo start --lan
```

**First launch on iPhone:**

Settings → General → VPN & Device Management → **Trust** your developer certificate.

---

## 7. Test the Voice Flow

### Prerequisites checklist

- trip-service running on `:8002` with `--host 0.0.0.0`
- voice-agent running, registered as `driver-assistant-local`
- `LIVEKIT_AGENT_NAME=driver-assistant-local` in trip-service
- `AGENT_NAME=driver-assistant-local` in voice-agent
- driver-app `.env` has correct Mac IP (not `localhost`) for physical device
- Metro running (`npx expo start --lan`)
- iPhone and Mac on **same Wi‑Fi**

### Test steps

1. Open **Driver App** on iPhone
2. Login with phone: `84867347452` (or any test driver)
3. Tap **🎤** on dashboard
4. Allow **microphone** permission
5. Tap **Connect**
6. Speak Vietnamese — e.g. *"Kiểm tra chuyến đi sắp tới"*

### Verify token endpoint (from Mac)

```bash
curl -X POST "http://localhost:8002/api/v1/voice/token?driver_phone=84867347452"
# Should return JSON with token, room_name, livekit_url
```

### Browser alternative (no phone)

Use agents-playground or voice-agent `test_server.py` — see `claude/voice-agent/setup.md`.

---

## 8. Service Ports Reference


| Service      | Port | Start command summary                             |
| ------------ | ---- | ------------------------------------------------- |
| call-center  | 8000 | `uvicorn app.main:app --port 8000`                |
| call-logger  | 8001 | `uvicorn app.main:app --port 8001`                |
| trip-service | 8002 | `uvicorn app.main:app --host 0.0.0.0 --port 8002` |
| Metro (Expo) | 8081 | `npx expo start --lan`                            |
| admin-panel  | 5173 | `npm run dev`                                     |


---

## 9. Common Problems


| Problem                             | Likely cause                                           | Fix                                                                          |
| ----------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| iPhone login/API fails              | `localhost` in `.env` or trip-service not on `0.0.0.0` | Use Mac LAN IP; restart trip-service with `--host 0.0.0.0`                   |
| **No script URL provided**          | Metro not reachable from phone                         | Same Wi‑Fi; `npx expo start --lan`; check `curl http://<MAC_IP>:8081/status` |
| App not on iPhone after build       | Used `xcodebuild install` only                         | Use `ios-deploy` or Xcode Run ▶                                              |
| No agent audio                      | Stale cloud worker or ElevenLabs quota                 | Use `driver-assistant-local`; check ElevenLabs credits                       |
| `No profiles for ...` signing error | Missing automatic signing                              | Set `CODE_SIGN_STYLE=Automatic` + team in Xcode                              |
| Developer Mode error                | iOS 16+ requirement                                    | Settings → Privacy & Security → Developer Mode                               |
| `ModuleNotFoundError: livekit`      | Dependencies not installed                             | `pip install -r requirements.txt` in voice-agent                             |
| `model_q8.onnx not found`           | Models not downloaded                                  | `ENV=local python -m app.main download-files`                                |
| Mac IP changed                      | DHCP after restart                                     | Run `ipconfig getifaddr en0`, update driver-app `.env`, restart Metro        |


---

## 10. Recommended Start Order (daily dev)

```bash
# 1. Backends
trip-service   → :8002 --host 0.0.0.0
voice-agent    → ENV=local python -m app.main dev

# 2. Metro (if using driver-app)
cd src/frontend/mobile-app/driver-app
REACT_NATIVE_PACKAGER_HOSTNAME=$(ipconfig getifaddr en0) npx expo start --lan

# 3. Open app
# Simulator: press `i` in Expo terminal
# iPhone: tap Driver App icon (native build already installed)
```

---

## 11. Further Reading


| Doc                                  | Content                             |
| ------------------------------------ | ----------------------------------- |
| `claude/knowledge.md`                | Architecture overview + room naming |
| `claude/driver-app/working.md`       | iPhone deploy bug log + fixes       |
| `claude/voice-agent/working.md`      | Voice agent dev log                 |
| `claude/voice-agent/setup.md`        | SIP / Twilio / LiveKit deep dive    |
| `claude/livekit.md`                  | LiveKit integration notes           |
| `src/backend/trip-service/README.md` | Trip API + DynamoDB setup           |
| `src/backend/voice-agent/README.md`  | Agent run commands                  |


---

## 12. Quick-Start Checklist (fresh clone)

- Install Node 20, Python 3.11+, Xcode (macOS)
- Clone repo
- Create `envs/.env.local` for voice-agent + trip-service
- `pip install -r requirements.txt` in voice-agent + trip-service
- `python -m app.main download-files` in voice-agent
- Create DynamoDB tables (AWS CLI)
- Start trip-service (`--host 0.0.0.0 :8002`)
- Start voice-agent (`ENV=local python -m app.main dev`)
- `npm install` in driver-app
- Configure driver-app `.env` with API URL + LiveKit URL
- Build + install native app (Xcode or ios-deploy) OR use Simulator
- Start Metro (`npx expo start --lan`)
- Test voice on iPhone ✅

