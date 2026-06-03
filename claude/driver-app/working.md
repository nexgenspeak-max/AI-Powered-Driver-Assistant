# driver-app — Working Log

App: Expo + React Native dev client for drivers (LiveKit voice assistant)
Stack: Expo SDK 54 · React Native 0.81 · LiveKit React Native · TypeScript
Status: ✅ Running on physical iPhone 11 (iOS 16.1.1) — voice flow ready for test

---

## What This App Does

- Driver login (phone number)
- Dashboard with trip list + online status
- **DigitalHumanScreen** — LiveKit voice session with AI assistant (`🎤` button)
- Fetches LiveKit token from trip-service: `POST /api/v1/voice/token?driver_phone=...`
- Connects to LiveKit Cloud room `driver-{phone}-{timestamp}`
- voice-agent worker joins same room and handles STT → LLM → TTS

---

## Key Files

| File | Purpose |
|------|---------|
| `src/frontend/mobile-app/driver-app/App.tsx` | Root navigation |
| `src/frontend/mobile-app/driver-app/src/screens/DigitalHumanScreen.tsx` | LiveKit room + mic + transcription UI |
| `src/frontend/mobile-app/driver-app/.env` | `EXPO_PUBLIC_TRIP_SERVICE_URL`, `EXPO_PUBLIC_LIVEKIT_URL` |
| `src/frontend/mobile-app/driver-app/ios/DriverApp.xcworkspace` | **Open this in Xcode** (not `.xcodeproj`) |
| `src/frontend/mobile-app/driver-app/ios/DriverApp/AppDelegate.swift` | LiveKit setup + Metro bundle URL (DEBUG) |
| `src/frontend/mobile-app/driver-app/ios/.xcode.env.local` | Node binary path for Xcode build scripts |
| `src/frontend/mobile-app/driver-app/ios/DriverApp.xcodeproj/project.pbxproj` | Signing: `CODE_SIGN_STYLE=Automatic`, `DEVELOPMENT_TEAM` |

---

## Local Dev Config (tested 2026-05-24)

### driver-app `.env`

```env
# Use Mac LAN IP when testing on physical iPhone (NOT localhost)
EXPO_PUBLIC_TRIP_SERVICE_URL=http://<MAC_LAN_IP>:8002
EXPO_PUBLIC_LIVEKIT_URL=wss://ai-powered-driver-assistant-77jfa364.livekit.cloud
```

Get Mac IP: `ipconfig getifaddr en0`

### voice-agent `envs/.env.local` (must match trip-service dispatch)

```env
AGENT_NAME=driver-assistant-local   # local-only — avoids stale cloud worker stealing jobs
```

### trip-service `envs/.env.local`

```env
LIVEKIT_AGENT_NAME=driver-assistant-local   # must match voice-agent AGENT_NAME
```

---

## iPhone Deploy — Process That Worked

Test device: **iPhone 11**, iOS **16.1.1**, USB name **"iPhone (2)"**, UDID `00008030-000178683C09802E`

### Step 1 — One-time iPhone setup

1. Connect USB, unlock phone, tap **Trust This Computer**
2. **Settings → Privacy & Security → Developer Mode → ON** → restart → confirm
3. iPhone and Mac on **same Wi‑Fi** (required for Metro + API, not just USB)

### Step 2 — Build native app (first time / after native changes)

```bash
cd src/frontend/mobile-app/driver-app/ios

xcodebuild \
  -workspace DriverApp.xcworkspace \
  -scheme DriverApp \
  -configuration Debug \
  -destination 'id=00008030-000178683C09802E' \
  -allowProvisioningUpdates \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM=<YOUR_TEAM_ID> \
  build
```

> Replace UDID with your device: `xcodebuild -showdestinations` or Xcode → Window → Devices and Simulators

### Step 3 — Install on device (real deploy)

`xcodebuild install` only stages build on Mac — **does NOT put app on phone**.

Use **ios-deploy**:

```bash
brew install ios-deploy   # one-time

ios-deploy \
  --id <DEVICE_UDID> \
  --bundle ~/Library/Developer/Xcode/DerivedData/DriverApp-*/Build/Products/Debug-iphoneos/DriverApp.app \
  --no-wifi
```

Expected: `[100%] InstallComplete`

### Step 4 — Trust developer cert (first launch)

**Settings → General → VPN & Device Management** → trust **Apple Development: your@email.com**

### Step 5 — Start Metro bundler (every dev session)

```bash
cd src/frontend/mobile-app/driver-app
REACT_NATIVE_PACKAGER_HOSTNAME=<MAC_LAN_IP> npx expo start --lan
```

Keep this terminal open. App name on home screen: **Driver App**.

### Step 6 — Start backends (voice test)

```bash
# Terminal 1 — trip-service (MUST bind 0.0.0.0 for iPhone on LAN)
cd src/backend/trip-service
uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload

# Terminal 2 — voice-agent
cd src/backend/voice-agent
ENV=local python -m app.main dev
```

### Step 7 — Test on iPhone

1. Open **Driver App**
2. Login: `84867347452` (or any registered driver phone)
3. Dashboard → **🎤** → Allow microphone → Connect
4. Speak Vietnamese — agent should respond

---

## Bug Log — Symptoms, Root Cause, Fix

### BUG-01: Expo Go cannot run this app

| | |
|---|---|
| **Symptom** | Expo Go shows incompatibility / missing native modules |
| **Root cause** | App uses `@livekit/react-native` + WebRTC — requires **custom dev client** (native build), not Expo Go |
| **Fix** | `npx expo prebuild` + build/install native app via Xcode or `ios-deploy` |

---

### BUG-02: `No profiles for 'com.doantotnghiep.driverapp'`

| | |
|---|---|
| **Symptom** | `npx expo run:ios --device` fails: automatic signing disabled, no provisioning profile |
| **Root cause** | `project.pbxproj` missing `CODE_SIGN_STYLE = Automatic` |
| **Fix** | Added to Debug + Release targets in `ios/DriverApp.xcodeproj/project.pbxproj`: |
| | `CODE_SIGN_STYLE = Automatic` |
| | `DEVELOPMENT_TEAM = <TEAM_ID>` |
| **Also needed** | Pass `-allowProvisioningUpdates` to xcodebuild (Expo CLI does not pass this by default) |

---

### BUG-03: `npx expo run:ios --device` still fails after signing fix

| | |
|---|---|
| **Symptom** | Same provisioning error; `EXPO_XCODEBUILD_ARGS="-allowProvisioningUpdates"` ignored |
| **Root cause** | Expo CLI does not forward `-allowProvisioningUpdates` to xcodebuild |
| **Fix** | Build directly with xcodebuild (see Step 2 above) or open `DriverApp.xcworkspace` → Run ▶ in Xcode |

---

### BUG-04: `INSTALL SUCCEEDED` but app not on iPhone

| | |
|---|---|
| **Symptom** | xcodebuild reports success, user sees no app icon on phone |
| **Root cause** | `xcodebuild install` creates **InstallationBuildProductsLocation on Mac** — it does not push `.app` to the device |
| **Fix** | Use `ios-deploy --bundle ... --id <UDID>` or Xcode Run ▶ |
| **Lesson** | "Install succeeded" in xcodebuild ≠ installed on physical device |

---

### BUG-05: `devicectl device install app` — device not found

| | |
|---|---|
| **Symptom** | `ERROR: The specified device was not found (Name: iPhone (2))` |
| **Root cause** | CoreDevice (`devicectl list`) shows device as `unavailable` even when Finder sees it; pairing/Developer Mode incomplete |
| **Fix** | Enable Developer Mode + trust Mac; use **UDID** not display name; prefer **ios-deploy** or **xcodebuild** (DVT layer sees device when CoreDevice does not) |
| **Verify** | `xcodebuild -showdestinations` should list `{ platform:iOS, id:..., name:iPhone (2) }` |

---

### BUG-06: App installed but won't launch — invalid code signature / not trusted

| | |
|---|---|
| **Symptom** | `Unable to launch com.doantotnghiep.driverapp ... profile has not been explicitly trusted` |
| **Root cause** | First install of development cert — iOS blocks until user trusts audit |
| **Fix** | Settings → General → VPN & Device Management → Trust developer |

---

### BUG-07: Red screen — **No script URL provided**

| | |
|---|---|
| **Symptom** | App opens on iPhone, red error: `No script URL provided` |
| **Root cause** | iPhone cannot reach Metro bundler (JS packager on port 8081). Common causes: |
| | • Metro not running |
| | • iPhone on different Wi‑Fi than Mac |
| | • `localhost` in config (localhost on phone = phone itself, not Mac) |
| | • Mac firewall blocking port 8081 |
| **Fix** | 1. Start Metro: `REACT_NATIVE_PACKAGER_HOSTNAME=<MAC_IP> npx expo start --lan` |
| | 2. iPhone + Mac same Wi‑Fi |
| | 3. Verify from Mac: `curl http://<MAC_IP>:8081/status` → `200` |
| | 4. Rebuild app if `ip.txt` inside bundle has stale IP (written at build time) |
| **Note** | App does **not** include `expo-dev-client` package — no dev launcher UI to manually enter URL |

---

### BUG-08: Voice connects but no agent audio (playground / mobile)

| | |
|---|---|
| **Symptom** | Room joins, "Waiting for agent audio track…", agent worker joins but silent |
| **Root cause 1** | Stale **cloud ECS worker** registered as `driver-assistant` steals dispatch jobs, joins room, publishes no audio |
| **Fix 1** | Local dev uses unique agent name: |
| | voice-agent: `AGENT_NAME=driver-assistant-local` |
| | trip-service: `LIVEKIT_AGENT_NAME=driver-assistant-local` |
| **Root cause 2** | ElevenLabs TTS quota exceeded (0 credits) |
| **Fix 2** | Top up ElevenLabs credits, or temporarily `TTS_PROVIDER=openai` |

---

### BUG-09: Tool calling crash in voice-agent

| | |
|---|---|
| **Symptom** | Agent crashes when LLM invokes tools |
| **Root cause** | `@function_tool(raw_schema={...})` incompatible with current livekit-agents version |
| **Fix** | Migrated all tools to `@function_tool(name=..., description=...)` |

---

### BUG-10: iPhone cannot reach trip-service API

| | |
|---|---|
| **Symptom** | Login fails / token request fails on phone but works on Mac browser |
| **Root cause** | trip-service bound to `127.0.0.1` only, or `.env` uses `localhost` |
| **Fix** | Start with `--host 0.0.0.0`; set `EXPO_PUBLIC_TRIP_SERVICE_URL=http://<MAC_LAN_IP>:8002` |

---

### BUG-11: Wrong device selected in expo run:ios

| | |
|---|---|
| **Symptom** | Build targets iPhone 14 (`iPhone của Chính`) — timeout, Developer Mode disabled |
| **Root cause** | Multiple devices in list; wrong one selected |
| **Fix** | Explicitly pass device: `npx expo run:ios --device "iPhone (2)"` or use UDID |

---

## iOS Version Notes

| Item | Value |
|------|-------|
| Test device | iPhone 11, iOS **16.1.1** |
| App minimum | iOS **15.1** (`IPHONEOS_DEPLOYMENT_TARGET` in Podfile) |
| Impact | ✅ No blocker — iOS 16.1.1 is supported |
| Developer Mode | Required on iOS 16+ for sideloading dev builds |

---

## Commands Quick Reference

```bash
# Metro (keep running)
cd src/frontend/mobile-app/driver-app
REACT_NATIVE_PACKAGER_HOSTNAME=$(ipconfig getifaddr en0) npx expo start --lan

# Build for device
cd src/frontend/mobile-app/driver-app/ios
xcodebuild -workspace DriverApp.xcworkspace -scheme DriverApp \
  -configuration Debug -destination 'id=<UDID>' \
  -allowProvisioningUpdates build

# Install on device
ios-deploy --id <UDID> \
  --bundle ~/Library/Developer/Xcode/DerivedData/DriverApp-*/Build/Products/Debug-iphoneos/DriverApp.app

# List devices (xcodebuild layer)
xcodebuild -workspace DriverApp.xcworkspace -scheme DriverApp -showdestinations | grep iPhone

# Health checks
curl http://$(ipconfig getifaddr en0):8002/health
curl http://$(ipconfig getifaddr en0):8081/status
curl "http://localhost:8002/api/v1/voice/token?driver_phone=84867347452" -X POST
```

---

## Completed Steps

- [x] Native iOS build with LiveKit + WebRTC
- [x] Automatic code signing configured
- [x] Deploy to iPhone 11 via ios-deploy
- [x] Metro bundler connection (same Wi‑Fi)
- [x] App launches on physical device
- [x] Local agent name isolation (`driver-assistant-local`)

## Remaining / Optional

- [ ] Add `expo-dev-client` for dev launcher UI (manual Metro URL entry)
- [ ] npm script wrapping xcodebuild + ios-deploy one-liner
- [ ] End-to-end voice test checklist on iPhone (document results here)
- [ ] Android physical device deploy guide

---

## Known Issues / Lessons

- **Never use Expo Go** for this app — always native dev client build
- **Open `DriverApp.xcworkspace`**, not `.xcodeproj` or `contents.xcworkspacedata` in Cursor
- **`xcodebuild install` ≠ deploy to phone** — use ios-deploy or Xcode Run
- **`devicectl` can fail** while xcodebuild/ios-deploy still works — trust xcodebuild destinations
- **Physical device needs LAN IP** everywhere: `.env`, Metro hostname, trip-service `--host 0.0.0.0`
- **Rebuild native app** after changing native deps (LiveKit, permissions); JS-only changes hot-reload via Metro
- **Kill duplicate voice-agent processes** — two workers can cause confusing dispatch behavior
- Mac IP changes after restart → update `driver-app/.env` and restart Metro
