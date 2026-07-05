# Capability Matrix — FAQ → Tool → Backend

Implementation status as of project snapshot. Update this file when trip-service APIs or tools change.

**Legend:** ✅ Working · ⚠️ Partial / stub backend · ❌ Not implemented

---

## Inbound driver tools (17)

| Tool | FAQ IDs | trip-service API | Tool code | Backend |
|------|---------|------------------|-----------|---------|
| `check_upcoming_trips` | T01–T05 | `GET /drivers/me/trips/upcoming` | ✅ | ✅ |
| `update_trip_status` | T10–T15 | `PATCH /trips/{id}` | ✅ | ✅ |
| `get_customer_location` | T20–T23 | `GET /trips/{id}/location` | ✅ | ❌ |
| `call_customer` | T30–T32 | `POST /calls/start` | ✅ | ⚠️ call-center |
| `summarize_last_call` | T33–T34 | `GET /calls/latest` + `POST /calls/{id}/summary` | ✅ | ❌ stub 404 |
| `confirm_trip_with_customer` | T35–T36 | `POST /trips/{id}/confirm-with-customer` | ✅ | ❌ |
| `create_reminder` | T53–T54 | `POST /reminders` | ✅ | ❌ |
| `request_cancel_trip` | T44–T45 | (in-memory confirm) | ✅ | ✅ via confirm step |
| `confirm_cancel_trip` | T46 | `PATCH /trips/{id}` → cancelled | ✅ | ✅ |
| `extend_wait_time` | T50–T52 | `POST /trips/{id}/extend-wait` | ✅ | ❌ |
| `report_customer_no_show` | T60–T62 | `POST /trips/{id}/no-show` | ✅ | ❌ |
| `report_trip_issue` | T63–T67 | `POST /trips/{id}/issues` | ✅ | ❌ |
| `get_today_earnings` | T70–T72 | `GET /drivers/me/earnings/today` | ✅ | ❌ |
| `get_driver_stats` | T73–T75 | `GET /drivers/me/profile` | ✅ | ❌ |
| `get_bonus_info` | T76–T78 | `GET /drivers/me/bonuses` | ✅ | ❌ |
| `set_driver_status` | T80–T84 | `PATCH /drivers/me/status` | ✅ | ⚠️ use `PATCH /drivers/{phone}` |
| `answer_app_faq` | G01–G06, playbook | LlamaIndex RAG (`knowledge/vi/`, `knowledge/en/`) | ✅ | ✅ (after `build_faq_index.py`) |

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

1. **P0** — `get_customer_location`, `confirm_trip` / `reject_trip` (core trip loop)
2. **P1** — `report_customer_no_show`, `extend_wait_time`, `summarize_last_call`
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

## Customer agent (separate scope)

Not driver FAQ — documented for completeness:

| Tool | Purpose |
|------|---------|
| `get_my_trip` | Customer trip status |
| `cancel_my_trip` | Customer cancel |
| `get_driver_eta` | Driver ETA to pickup |

See `CUSTOMER_SUPPORT_PROMPT` in `system_instructions.py`.
