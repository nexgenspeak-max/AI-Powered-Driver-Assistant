# AI Voicebot LiveKit Architecture

## Overview

This project is a real-time AI Voicebot platform for drivers.

The system allows drivers to communicate naturally using voice commands.

Examples:

- "Tôi có chuyến đi nào không?"
- "Gọi cho khách hàng AA giúp tôi"
- "Nhắc tôi trước 10 phút"
- "Khách hàng đang ở đâu?"
- "Tóm tắt cuộc gọi vừa rồi"

The AI should:
- Understand user intent
- Call backend APIs
- Execute actions safely
- Respond back using voice

---

# Recommended Architecture

```txt
Mobile App
    ↓
LiveKit Room
    ↓
Voice Agent
    ↓
STT Provider
    ↓
LLM Provider
    ↓
Backend APIs
    ↓
TTS Provider
    ↓
Driver Audio Response
```

---

# Recommended Repository Structure

```txt
voice-agent/
├── src/
│   ├── main.ts
│   │
│   ├── config/
│   │   ├── env.ts
│   │   └── ai-profile.config.ts
│   │
│   ├── livekit/
│   │   ├── livekit.module.ts
│   │   ├── livekit.service.ts
│   │   ├── room.service.ts
│   │   └── token.service.ts
│   │
│   ├── ai/
│   │   ├── agent/
│   │   │   ├── voice-agent.ts
│   │   │   ├── agent-session.ts
│   │   │   └── agent-prompt.ts
│   │   │
│   │   ├── providers/
│   │   │   ├── stt/
│   │   │   ├── llm/
│   │   │   └── tts/
│   │   │
│   │   ├── factory/
│   │   │   ├── stt.factory.ts
│   │   │   ├── llm.factory.ts
│   │   │   ├── tts.factory.ts
│   │   │   └── voice-agent.factory.ts
│   │   │
│   │   ├── intents/
│   │   │   ├── intent-detector.ts
│   │   │   ├── intent-router.ts
│   │   │   └── intent.types.ts
│   │   │
│   │   └── tools/
│   │       ├── trip.tool.ts
│   │       ├── reminder.tool.ts
│   │       ├── call-customer.tool.ts
│   │       └── navigation.tool.ts
│   │
│   ├── domain/
│   │   ├── trips/
│   │   ├── drivers/
│   │   ├── calls/
│   │   └── reminders/
│   │
│   ├── conversation/
│   │   ├── conversation.service.ts
│   │   ├── conversation-memory.ts
│   │   └── conversation.repository.ts
│   │
│   └── shared/
│       ├── logger/
│       ├── errors/
│       ├── constants/
│       └── types/
│
├── .env
├── package.json
└── README.md
```

---

# Main Idea

## LiveKit Responsibility

LiveKit should ONLY handle:
- Realtime audio transport
- Voice streaming
- Room/session handling
- Audio publish/subscribe

LiveKit should NOT contain:
- Business logic
- Trip logic
- Driver logic
- AI reasoning

---

# AI Provider Architecture

The system must support changing:
- STT provider
- LLM provider
- TTS provider
- Voice model

without rewriting the whole system.

---

# STT Providers

Possible providers:
- OpenAI STT
- Deepgram
- Google STT

---

# LLM Providers

Possible providers:
- OpenAI
- Gemini
- Claude

---

# TTS Providers

Possible providers:
- Google TTS
- ElevenLabs
- Cartesia

---

# Example Environment Configuration

```env
STT_PROVIDER=deepgram
STT_MODEL=nova-3

LLM_PROVIDER=openai
LLM_MODEL=gpt-5.6-luna

TTS_PROVIDER=google
TTS_VOICE=vi-VN-Standard-A
```

---

# Intent Detection

The AI should detect user intents.

Examples:
- CHECK_UPCOMING_TRIPS
- CALL_CUSTOMER
- CREATE_REMINDER
- CANCEL_TRIP
- UPDATE_TRIP_STATUS
- OPEN_NAVIGATION
- SUMMARIZE_CALL

---

# Example User Scenario

## User says

"Tôi có chuyến đi nào không?"

## AI flow

1. Convert speech to text
2. Detect intent
3. Call backend API
4. Generate response
5. Convert response to speech
6. Speak back to user

---

# Example Backend API

```http
GET /drivers/me/trips/upcoming
```

---

# Recommended Mobile Stack

- React Native
- Expo Development Build
- TypeScript
- Tamagui
- Zustand
- React Query
- Axios
- LiveKit

---

# Recommended Backend Stack

- Node.js
- NestJS
- Redis
- PostgreSQL
- AWS

---

# Final Goal

Build a real AI Driver Assistant.

The driver should interact naturally using voice.

The AI should:
- Understand intent
- Execute backend actions
- Respond safely
- Reduce phone interaction
- Improve driver safety
