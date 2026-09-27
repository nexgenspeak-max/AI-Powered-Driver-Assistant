# Capability Matrix — FAQ → Tool → Backend

Implementation status as of 2026-08-30. Update when trip-service APIs or tools change.

**Legend:** ✅ Working · ⚠️ Partial / stub backend · ❌ Not implemented

**Tool counts (code):** VN inbound **37** · EN inbound **24** (partial parity) · Outbound **2** each

Parity check: `python scripts/check_tool_parity.py` (Phase 0 allow-list for EN gaps).

---

## Inbound driver tools (VN — 37)

| Tool | FAQ IDs | trip-service API | Tool code | Backend |
|------|---------|------------------|-----------|---------|
| `check_upcoming_trips` | T01–T05 | `GET /drivers/me/trips/upcoming` | ✅ | ✅ |
| `refresh_latest_data` | — | prefetch refresh | ✅ | ✅ |
| `get_current_trip_info` | T06–T09 | upcoming + context | ✅ | ✅ |
| `suggest_next_stop` | — | route suggest | ✅ | ⚠️ |
| `get_optimal_route` | — | route optimize | ✅ | ⚠️ |
| `get_trip_traffic` | — | traffic | ✅ | ⚠️ partial |
| `confirm_trip` | T40–T41 | `PATCH /trips/{id}` | ✅ VN inbound | ✅ |
| `reject_trip` | T42–T43 | `PATCH /trips/{id}` | ✅ VN inbound | ✅ |
| `update_trip_status` | T10–T15 | `PATCH /trips/{id}` | ✅ | ✅ |
| `request_cancel_trip` | T44–T45 | (in-memory confirm) | ✅ | ✅ via confirm step |
| `confirm_cancel_trip` | T46 | `PATCH /trips/{id}` → cancelled | ✅ | ✅ |
| `call_customer` | T30–T32 | `POST /calls/start` | ✅ | ⚠️ call-center |
| `call_custom_number` | — | custom dial | ✅ VN only | ⚠️ |
| `confirm_call_custom_number` | — | custom dial confirm | ✅ VN only | ⚠️ |
| `find_contact` | — | contacts lookup | ✅ VN only | ⚠️ |
| `select_contact_match` | — | contacts pick | ✅ VN only | ⚠️ |
| `confirm_contact_call` | — | contact dial confirm | ✅ VN only | ⚠️ |
| `get_customer_location` | T20–T23 | `GET /trips/{id}/location` (optional; tool reads prefetch cache) | ✅ | ✅ (cache); API unused at tool time |
| `confirm_trip_with_customer` | T35–T36 | `POST /trips/{id}/confirm-with-customer` | ✅ | ❌ |
| `send_sms_to_customer` | — | SMS | ✅ VN only | ❌ |
| `send_sms_to_custom_number` | — | SMS custom | ✅ VN only | ❌ |
| `confirm_send_sms_to_custom_number` | — | SMS confirm | ✅ VN only | ❌ |
| `find_contact_to_message` | — | SMS contact find | ✅ VN only | ❌ |
| `select_contact_match_for_sms` | — | SMS contact pick | ✅ VN only | ❌ |
| `confirm_send_sms_to_contact` | — | SMS contact confirm | ✅ VN only | ❌ |
| `summarize_last_call` | T33–T34 | `GET /calls/latest` + summary | ✅ | ❌ stub 404 |
| `check_customer_call_status` | — | call status | ✅ | ⚠️ |
| `create_reminder` | T53–T54 | `POST /reminders` | ✅ | ❌ |
| `extend_wait_time` | T50–T52 | `POST /trips/{id}/extend-wait` | ✅ | ❌ |
| `report_customer_no_show` | T60–T62 | `POST /trips/{id}/no-show` | ✅ | ❌ |
| `report_trip_issue` | T63–T67 | `POST /trips/{id}/issues` | ✅ | ❌ |
| `get_today_earnings` | T70–T72 | `GET /drivers/me/earnings/today` | ✅ | ❌ |
| `get_driver_stats` | T73–T75 | `GET /drivers/me/profile` | ✅ | ❌ |
| `get_bonus_info` | T76–T78 | `GET /drivers/me/bonuses` | ✅ | ❌ |
| `set_driver_status` | T80–T84 | `PATCH /drivers/me/status` | ✅ | ⚠️ |
| `answer_app_faq` | G01–G06 | LlamaIndex RAG | ✅ | ✅ |
| `end_conversation` / `end_call` | — | session teardown | ✅ | ✅ |

**EN inbound:** Same core trip/earnings/reporting set minus SMS (6), contact/custom call (5), inbound confirm/reject (2). Uses `end_call` instead of `end_conversation`.

---

## Outbound driver tools (2)

| Tool | FAQ IDs | trip-service API | Status |
|------|---------|------------------|--------|
| `confirm_trip` | T40–T41, O01 | `PATCH /trips/{id}` → confirmed | ✅ |
| `reject_trip` | T42–T43, O02 | `PATCH /trips/{id}` → rejected | ✅ |

---

## Backend API gaps (trip-service)

These endpoints are called from `app/services/backend_api.py` but **not implemented** in trip-service TypeScript routes:

```
GET  /api/v1/drivers/me/profile
GET  /api/v1/drivers/me/earnings/today
GET  /api/v1/drivers/me/earnings/summary
GET  /api/v1/drivers/me/bonuses
PATCH /api/v1/drivers/me/status
GET  /api/v1/trips/{id}/location
POST /api/v1/trips/{id}/confirm-with-customer
POST /api/v1/trips/{id}/no-show
POST /api/v1/trips/{id}/issues
POST /api/v1/trips/{id}/extend-wait
POST /api/v1/reminders
GET  /api/v1/calls/latest          (stub 404)
POST /api/v1/calls/{id}/summary    (stub 404)
```

**Priority for full FAQ coverage:**

1. **P0** — `get_customer_location`, outbound `confirm_trip` / `reject_trip`
2. **P1** — `report_customer_no_show`, `extend_wait_time`, `summarize_last_call`, `get_earnings_summary` (planned tool)
3. **P2** — earnings, stats, bonuses, reminders

---

## Prefetch (latency optimization)

`app/voicebot/processors/prefetch.py` preloads data at session start:

| Key | API | Used by |
|-----|-----|---------|
| `upcoming_trips` | upcoming trips | greeting context |
| `today_earnings` | earnings/today | `get_today_earnings` |

Extend prefetch when new read-heavy tools are added.

---

## Language routing (Phase 0)

| Layer | Mechanism |
|-------|-----------|
| Worker default | `AGENT_LANG=vn\|en` in llm-orchestrator env |
| Per session | `room.metadata.lang` from trip-service `/voice/token?lang=` |
| driver-app | `resolveVoiceAgentLang()` → query param |
| STT/TTS | Global env per worker — must match locale bundle |

See [driver-tools-architecture-plan.md](./driver-tools-architecture-plan.md) §3.
