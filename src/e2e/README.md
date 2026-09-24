# E2E Testing — Driver Assistant

End-to-end test guide for the **driver voice bot** full flow.  
Scenario catalog: [`../backend/llm-orchestrator/requirements/scenario.md`](../backend/llm-orchestrator/requirements/scenario.md)

---

## Quick start (API smoke — no mic)

```bash
# 1. Start external-api-service
cd src/backend/external-api-service && npm install && npm run dev

# 2. Run API smoke (another terminal)
cd src/e2e
cp .env.example .env.local   # optional — defaults work for local
chmod +x scripts/*.sh
./scripts/run_api_smoke.sh
```

Expected: health OK → trip created → `/drivers/me/context` has data → status PATCH works.

---

## Full voice flow (recommended for thesis demo)

### Terminal 1 — external-api-service

```bash
cd src/backend/external-api-service
npm run dev
# → external-api-service running on :8002
```

### Terminal 2 — llm-orchestrator

```bash
cd src/backend/llm-orchestrator
source .venv/bin/activate
python -m app.main download-files   # one-time
ENV=local python -m app.main dev
# → registered worker {"agent_name": "driver-assistant-local"}
```

### Terminal 3 — seed data

```bash
cd src/e2e
./scripts/seed_trip.sh confirmed
./scripts/check_driver_context.sh
```

### Terminal 4 — agents playground (mic test)

```bash
cd src/frontend/agents-playground
# Copy LIVEKIT_* from llm-orchestrator/envs/.env.local into .env.local
pnpm install && pnpm dev
# → http://localhost:3000
```

**Playground settings:**

| Setting | Value |
|---------|-------|
| Agent name | `driver-assistant-local` (match `AGENT_NAME` in llm-orchestrator `.env.local`) |
| Room name | leave empty → auto `driver-84867347452-{timestamp}` |
| Mic + Audio | ON |

Click **Connect** → **Start Audio** → speak Vietnamese test phrases.

### Optional — admin panel (create trip via UI)

```bash
cd src/frontend/admin-panel
cp envs/.env.example .env.local
npm install && npm run dev
# Create trip for driver 84867347452 → Dispatch
```

### Optional — call customer (F1)

Requires external-channel-service + ngrok:

```bash
cd src/backend/external-channel-service && npm run dev   # :8000
# Set BASE_URL to ngrok URL in external-channel-service env
```

---

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/run_api_smoke.sh` | Full API smoke (run this first) |
| `scripts/verify_services.sh` | Check external-api-service / external-channel-service / call-records-service |
| `scripts/seed_trip.sh [status]` | Create trip for `DRIVER_PHONE` (default `confirmed`) |
| `scripts/check_driver_context.sh [true]` | Verify prefetch endpoint (`?fresh=true` optional) |
| `scripts/test_trip_status.sh [trip_id]` | PATCH ARRIVED_PICKUP → PICKED_UP → COMPLETED |

### Config

Copy `.env.example` → `.env.local`:

```env
TRIP_SERVICE_URL=http://localhost:8002
DRIVER_PHONE=84867347452
```

`DRIVER_PHONE` must match playground `TEST_DRIVER_PHONE` and trip `driver_phone`.

---

## Voice test checklist (map to scenario.md)

After connect + seed, say these in order:

| # | Say (VI) | Expected tool | Scenario ID |
|---|----------|---------------|---------------|
| 1 | "Chuyến tiếp theo của tôi là gì?" | `check_upcoming_trips` | T01 |
| 2 | "Khách đứng ở đâu?" | `get_customer_location` | T20 |
| 3 | "Hôm nay tôi kiếm được bao nhiêu?" | `get_today_earnings` | T70 |
| 4 | "Tôi đến nơi rồi." | `update_trip_status` | T10 |
| 5 | "Khách đã lên xe." | `update_trip_status` | T12 |
| 6 | "Xong chuyến rồi." | `update_trip_status` | T14 |
| 7 | "Ứng dụng hỗ trợ những gì?" | `answer_app_faq` | G01 |

**Multi-step flows** (seed new trip first):

| Flow | Steps | Scenario |
|------|-------|----------|
| Cancel trip | "Hủy chuyến" → "Có" | F2 (T44–T46) |
| Call customer | "Gọi khách" → choose mode | F1 (T30–T32) |
| No-show | "Khách không ra" | F3 (T60) |

Re-seed before each flow that needs an active trip:

```bash
./scripts/seed_trip.sh confirmed
```

---

## Architecture under test

```
Session start
  → prefetch: GET /drivers/me/context  (1 API call)
  → tools read context_store (no await)
  → mutations: patch local context + background API sync
  → external-api-service invalidates Redis/in-memory cache on writes
```

Verify prefetch in llm-orchestrator logs:

```
driver prefetch complete | phone=84867347452 upcoming=1 current=True
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Agent joins but no audio | Check `AGENT_NAME` matches playground; only one worker running |
| "Không có chuyến" | Run `seed_trip.sh`; phone must match room `driver-{phone}-*` |
| Prefetch empty | `curl -H "X-Driver-Phone: +84867347452" localhost:8002/api/v1/drivers/me/context` |
| DynamoDB errors | Create table — see `external-api-service/README.md` |
| STT fails | Check `GOOGLE_CREDENTIALS_FILE` / `STT_PROVIDER` in llm-orchestrator env |
| call_customer fails | Start external-channel-service :8000; Twilio trial needs verified number |

---

## What is NOT in e2e yet

- Automated Playwright (admin UI + playground)
- pytest for llm-orchestrator tools (use `llm-orchestrator/tests/smoke_test.py` for imports/env)
- SIP outbound dispatch test (needs LiveKit SIP + real phone)

Add these later under `src/e2e/` as needed.
