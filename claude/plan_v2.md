# AI-Powered Driver Assistant — Build Plan v2

## Vision

A real ride-hailing system with three user types:
- **Customer** books a trip via app/website — or calls in and voice AI books it for them
- **Driver** gets a push notification, opens app, sees route + traffic, taps Accept
- **Admin** manages trips and drivers via a dashboard

---

## Full Architecture

```
                    ┌─────────────────────────┐
                    │   Customer App / Web     │
                    │   (React PWA)            │
                    │   Book trip · Track ride │
                    └───────────┬─────────────┘
                                │
  Customer calls ──────┐        │ POST /trips
  (no app / prefer     │        │
   voice)              ▼        ▼
              ┌─────────────────────────────────────┐
              │          trip-service               │
              │   (FastAPI + Lambda + DynamoDB)     │
              │                                     │
              │  Trip CRUD · Driver registry        │
              │  FCM push · Google Maps prefetch    │
              │  Dispatch: push (primary)           │
              │           SIP call (fallback)       │
              └──────┬───────────────┬─────────────┘
                     │ FCM           │ LiveKit SIP (fallback only)
                     ▼               ▼
          ┌──────────────────┐  ┌──────────────────────────────┐
          │   Driver App     │  │   voice-agent (ECS Fargate)  │
          │   (React PWA)    │  │                              │
          │                  │  │  CustomerAgent  — inbound    │
          │  Trip card       │  │    caller not a driver →     │
          │  Accept/Reject   │  │    AI captures trip details  │
          │  Maps + traffic  │  │    → creates trip            │
          │  Voice button ───┼──▶                              │
          │  (LiveKit WebRTC)│  │  DriverAgent    — inbound /  │
          └──────────────────┘  │    outbound fallback /       │
                                │    in-app WebRTC             │
                                └──────────────────────────────┘

          ┌──────────────────────────────────────────┐
          │   Admin Panel  (React Web)               │
          │   Trip board · Driver list · Dispatch    │
          └──────────────────────────────────────────┘
```

---

## Services & Apps

| Name | Type | Stack | Status |
|---|---|---|---|
| `call-center` | Backend | FastAPI + Lambda | ✅ Done |
| `voice-agent` | Backend | livekit-agents + ECS | ✅ Done |
| `call-logger` | Backend | FastAPI + Lambda + DynamoDB | ✅ Done |
| `trip-service` | Backend | FastAPI + Lambda + DynamoDB | ✅ Done (FCM + auto-fallback in Phase 4) |
| `customer-app` | Mobile | React Native (Expo) | ⬜ Todo |
| `driver-app` | Mobile | React Native (Expo) | ⬜ Todo |
| `admin-panel` | Web | React + Vite | ⬜ Todo |

---

## Two Voice Flows

### Flow 1 — Customer calls in (no app)
```
Customer dials +19068288788
→ call-center → LiveKit SIP → voice-agent
→ check caller phone: not in drivers table → CustomerAgent
→ "Xin chào! Bạn muốn đặt xe đi đâu?"
→ AI captures: pickup, dropoff, time, name via function tools
→ POST /api/v1/trips → trip created
→ "Đã đặt xe! Tài xế sẽ nhận chuyến sớm."
→ FCM push to available driver
```

### Flow 2 — Driver in-app voice (hands-free while driving)
```
Driver taps 🎤 in driver-app
→ app joins LiveKit room via WebRTC (no SIP/Twilio)
→ DriverAgent handles conversation
→ driver asks about next trip, traffic, etc.
→ app leaves room when done
Cost: ~$0.003/min vs $0.02/min for SIP
```

---

## Build Order

### Phase 1 — trip-service ✅ DONE (2026-05-19)
- [x] Trip CRUD — create, get, list, update status, notify, dispatch
- [x] Filter trips by status, driver phone (polling endpoint)
- [x] Driver registry — register, get, list, online/offline toggle
- [x] Google Maps prefetch — ETA, traffic note, distance on trip create
- [x] `/trips/{id}/notify` — marks trip as notified (driver app polls this)
- [x] `/trips/{id}/dispatch` — outbound SIP call fallback
- [x] DynamoDB tables: `local-driver-assistant-trips` + `local-driver-assistant-drivers`
- [x] SAM infra + deploy.sh + teardown.sh
- [ ] FCM push notification — Phase 4 (polling works for local demo)
- [ ] Auto-fallback SIP after N minutes — Phase 4

### Phase 2 — Customer App (React Native / Expo)
- [ ] Home: pickup + dropoff input + time picker
- [ ] Submit → POST /trips → show "Finding driver..."
- [ ] Trip status screen: pending / confirmed / driver on the way
- [ ] Simple — no login needed (phone number = identity)

### Phase 3 — Driver App (React Native / Expo)
- [ ] Login with phone (matches drivers table)
- [ ] Online/Offline toggle
- [ ] Trip notification — polling every 3s for local dev, FCM for production
- [ ] Trip card: customer, pickup → dropoff, ETA, traffic
- [ ] Accept / Reject buttons
- [ ] In-app voice button (LiveKit WebRTC via @livekit/react-native)
- [ ] Opens Google Maps / Apple Maps for navigation

### Phase 4 — Admin Panel
- [ ] Trip board: all trips + live status badges
- [ ] Driver list: online/offline, current trip
- [ ] Manual dispatch: assign driver + trigger call
- [ ] Trip detail: full timeline, call recording link

### Phase 5 — voice-agent: CustomerAgent
- [ ] Detect caller type (driver vs customer) by phone lookup
- [ ] `CustomerAgent` class — books trip via conversation
- [ ] Function tools: `set_pickup`, `set_dropoff`, `set_time`, `confirm_booking`
- [ ] After booking: notify driver via FCM

### Phase 6 — Polish
- [ ] Fallback auto-trigger (trip-service scheduler)
- [ ] SMS confirmation to customer after booking
- [ ] Driver earnings / trip history
- [ ] Rating system

---

## Screen mockups

### Customer App
```
┌─────────────────────┐    ┌─────────────────────┐
│  Đặt xe             │    │  Đang tìm tài xế... │
│                     │    │                     │
│  Điểm đón:          │    │  ⏳ Đã gửi yêu cầu  │
│  [123 Lê Lợi Q1  ] │    │                     │
│                     │    │  Tài xế Minh        │
│  Điểm đến:          │    │  🚗 Đang đến        │
│  [45 Ng Huệ Q1   ] │    │  ETA: 5 phút        │
│                     │    │                     │
│  Giờ đón: [14:30 ] │    │  ──────────────────  │
│  Tên: [Nguyễn A  ] │    │  Hoặc gọi để đặt:   │
│                     │    │  📞 +1 906 828 8788 │
│  [   Đặt xe   ]    │    │                     │
└─────────────────────┘    └─────────────────────┘
```

### Driver App
```
┌─────────────────────┐    ┌─────────────────────┐
│  Xin chào Minh  🟢  │    │  Chuyến mới! 🔔     │
│  [Online] [Offline] │    │                     │
│                     │    │  Khách: Nguyễn A    │
│  Hôm nay: 3 chuyến  │    │  Đón: 123 Lê Lợi   │
│  Thu nhập: 250k     │    │  Đến: 45 Ng Huệ    │
│                     │    │  14:30 · 4.5km      │
│  ── Chuyến mới ──   │    │  18 phút · thông thoáng│
│  🟡 Nguyễn A        │    │                     │
│  123 Lê Lợi →       │───▶│  [  ✅ Nhận  ]      │
│  45 Ng Huệ  14:30   │    │  [  ❌ Từ chối ]    │
│                     │    │                     │
│       [🎤 Hỏi bot]  │    │  [🎤 Hỏi bot]      │
└─────────────────────┘    └─────────────────────┘
```

---

## Data Model additions

### Drivers table  `{env}-driver-assistant-drivers`
| Field | Type |
|---|---|
| `phone` | String PK |
| `name` | String |
| `fcm_token` | String |
| `status` | `online` / `offline` |
| `registered_at` | String |

### Trips table  `{env}-driver-assistant-trips` (updated)
| Field | Type |
|---|---|
| `trip_id` | String PK |
| `status` | `pending` → `notified` → `confirmed` / `rejected` / `no_answer` / `completed` |
| `driver_phone` | String |
| `customer_name` | String |
| `customer_phone` | String |
| `pickup_address` | String |
| `dropoff_address` | String |
| `pickup_time` | String |
| `distance_km` | Number |
| `eta_minutes` | Number |
| `traffic_note` | String |
| `route_summary` | String |
| `booked_via` | `app` / `voice` / `admin` |
| `room_name` | String |
| `created_at` | String |
| `updated_at` | String |

---

## Cost estimate

| Item | Cost |
|---|---|
| FCM push notifications | Free |
| Lambda + DynamoDB | ~$0/month at this scale |
| LiveKit WebRTC (in-app voice) | ~$0.003/min |
| Twilio SIP fallback | ~$0.02/call (only when driver has no app) |
| **Per trip (app user)** | **~$0.001** |
| **Per trip (voice booking + fallback call)** | **~$0.05** |

---

## Data Model

### Drivers table  `{env}-driver-assistant-drivers`
| Field | Type | Description |
|---|---|---|
| `phone` | String PK | `+84867347452` |
| `name` | String | Display name |
| `fcm_token` | String | Firebase push token |
| `status` | String | `online` / `offline` |
| `registered_at` | String | ISO 8601 |

### Trips table  `{env}-driver-assistant-trips`
| Field | Type | Description |
|---|---|---|
| `trip_id` | String PK | UUID |
| `status` | String | `pending` → `notified` → `confirmed` / `rejected` / `no_answer` |
| `driver_phone` | String | Assigned driver |
| `customer_name` | String | |
| `pickup_address` | String | |
| `dropoff_address` | String | |
| `pickup_time` | String | |
| `distance_km` | Number | From Google Maps |
| `eta_minutes` | Number | Traffic-aware |
| `traffic_note` | String | Vietnamese traffic summary |
| `route_summary` | String | Main road names |
| `room_name` | String | LiveKit room (if voice used) |
| `created_at` | String | ISO 8601 |
| `updated_at` | String | ISO 8601 |

---

## Driver App — Screens

```
┌──────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│  Login       │    │  Trip List           │    │  Trip Detail    │
│              │    │                      │    │                 │
│  Phone: ____ │    │  🟡 Chuyến mới       │    │  Khách: Nam     │
│              │    │  Đón: 123 Lê Lợi     │    │  Đón: 123 Lê Lợi│
│  [Đăng nhập] │───▶│  Đến: 45 Ng Huệ     │───▶│  Đến: 45 Ng Huệ│
│              │    │  14:30 · 4.5km       │    │  14:30 · 18 phút│
│              │    │                      │    │  Thông thoáng   │
│              │    │  ─────────────────   │    │                 │
│              │    │  ✅ Đã xác nhận      │    │  [Google Map]   │
│              │    │  Đón: Quận 3         │    │                 │
│              │    │  14:00 · 3.2km       │    │  [✅ Nhận]  [❌]│
│              │    │                      │    │  [🎤 Hỏi bot]  │
└──────────────┘    └──────────────────────┘    └─────────────────┘
```

The **🎤 Hỏi bot** button connects to LiveKit via WebRTC — driver can ask the AI anything hands-free while driving.

---

## Cost comparison

| | Phone call only (v1) | App + fallback (v2) |
|---|---|---|
| Per trip notification | ~$0.05 | ~$0.001 |
| 100 trips/day | ~$150/month | ~$3-5/month |
| Voice AI per minute | ~$0.02 (SIP) | ~$0.003 (WebRTC) |

---

## Current Status

**Now building: Phase 2 — Customer App (PWA)**

| Phase | Status |
|---|---|
| Phase 1 — trip-service | ✅ Done 2026-05-19 |
| Phase 2 — Customer App (PWA) | 🔨 Next |
| Phase 3 — Driver App (PWA) | ⬜ |
| Phase 4 — Admin Panel | ⬜ |
| Phase 5 — CustomerAgent (voice booking) | ⬜ |
| Phase 6 — Polish (FCM, fallback, ratings) | ⬜ |

**Local dev — how to run everything:**
```bash
# Terminal 1
cd src/call-logger && AWS_PROFILE=david uvicorn app.main:app --port 8001

# Terminal 2
cd src/trip-service && AWS_PROFILE=david uvicorn app.main:app --port 8002

# Terminal 3
cd src/voice-agent && python -m app.main dev

# Terminal 4 (coming)
cd src/frontend/admin-panel && npm run dev       # port 5173

# Terminal 5 (coming) — scan QR with Expo Go on phone
cd src/frontend/customer-app && npx expo start

# Terminal 6 (coming) — scan QR with Expo Go on phone
cd src/frontend/driver-app && npx expo start --port 8082
```
