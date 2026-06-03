# AI-Powered Driver Assistant — Step-by-Step Build Plan

**Stack:** Python FastAPI · LiveKit · Twilio · OpenAI GPT-4o-mini · Deepgram STT · ElevenLabs TTS · PostgreSQL · Redis · React Native

---

## Overview of All Steps

| Step | What | Status |
|------|------|--------|
| 1 | **Call Center** — Twilio inbound + outbound call handling | ✅ DONE |
| 2 | **Voice Pipeline** — LiveKit + STT + LLM + TTS streaming | ✅ DONE |
| 3 | **Driver Bot Agent** — Vietnamese AI voicebot | ✅ DONE |
| 4 | **Call Summary** — Auto-transcribe + summarize → read to driver | ⬜ TODO |
| 5 | **Trip Confirmation** — Voice dialogue to confirm booking | ⬜ TODO |
| 6 | **Reminder System** — Pickup time voice alerts | ⬜ TODO |
| 7 | **Schedule Assistant** — Query upcoming trips hands-free | ⬜ TODO |
| 8 | **Database Layer** — PostgreSQL schema + Redis sessions | ⬜ TODO |
| 9 | **Mobile App** — React Native driver dashboard | ⬜ TODO |
| 10 | **Testing & Evaluation** — Latency, WER, task success | ⬜ TODO |

> See `claude/plan_v2.md` for the revised architecture with driver PWA + push notifications.

---

## Current Status

Step 1 completed: 2026-05-16.
- Twilio number: +19068288788
- Inbound + outbound calls working locally (ngrok)
- Service lives at: `src/call-center/`
- Deploy to AWS: `bash infra/call-center/deploy.sh dev`
- Teardown: `bash infra/call-center/teardown.sh dev`
- Env files: `src/call-center/envs/.env.{local|dev|prod}`

Step 2 completed: 2026-05-16.
- LiveKit voice pipeline working end-to-end
- Twilio SIP → LiveKit SIP (`sip:5on4wixbq.sip.livekit.cloud;transport=tls`) → agent worker
- STT: OpenAI Whisper (switchable to Deepgram Nova-2)
- LLM: GPT-4o-mini
- TTS: ElevenLabs Flash v2.5
- Service lives at: `src/voice-agent/`
- SIP trunk: `ST_65EBPmZTeo3b`, dispatch rule: `SDR_rLQY2QxSoQeU`
- Deploy to AWS: `bash infra/voice-agent/deploy.sh dev`
- Env files: `src/voice-agent/envs/.env.{local|dev}`
- Docs: `claude/voice-agent/setup.md`, `claude/voice-agent/deploy.md`

Step 3 completed: 2026-05-16.
- `DriverAgent` class with Vietnamese system prompt
- On-enter greeting: "Xin chào! Tôi là trợ lý AI của bạn..."
- Tools: `confirm_trip`, `reject_trip`, `get_next_trip` (stubs — DB wired in Step 8)
- Tested via real phone call (+84867347452 → +19068288788 → agent ✅)

call-logger service completed: 2026-05-16.
- Lambda + API Gateway + DynamoDB
- Stores transcript + GPT summary after every call
- Service lives at: `src/call-logger/`
- Deploy: `bash infra/call-logger/deploy.sh dev`

trip-service backend completed: 2026-05-17.
- Lambda + API Gateway + DynamoDB
- Trip CRUD, Google Maps prefetch, LiveKit SIP dispatch
- Service lives at: `src/trip-service/`
- Deploy: `bash infra/trip-service/deploy.sh dev`
- Next: add driver registry + FCM push (see plan_v2.md Phase 1)
