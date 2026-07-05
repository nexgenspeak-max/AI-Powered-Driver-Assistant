# Driver Support Scope

## Goal

Provide **hands-free voice support** for ride-hailing drivers while driving. The AI answers questions, performs trip actions, contacts customers, and reports issues — without the driver touching the phone screen.

---

## Target user

| Attribute | Description |
|-----------|-------------|
| Role | Registered driver in the platform |
| Context | Driving or parked briefly; eyes on the road |
| Language | Vietnamese (primary), English (secondary) |
| Identity | Phone number from LiveKit room name (`driver-{phone}-{ts}`) |

---

## Design principles

1. **Short answers** — One or two sentences; no long lists unless the driver asks for details.
2. **Safety first** — No multi-step instructions while driving; confirm destructive actions.
3. **Confirm before act** — Cancel trip, report no-show, start outbound call → ask once.
4. **Natural Vietnamese** — Address driver as *anh/chị*; avoid reading full addresses verbatim.
5. **Tool-backed facts** — Trip status, earnings, location come from APIs; do not invent data.
6. **Graceful fallback** — If API fails: *"Hiện không lấy được thông tin, anh/chị thử lại sau."*

---

## Support categories (in scope)

| # | Category | Examples |
|---|----------|----------|
| 1 | **Trip schedule** | Next trip, list upcoming, current active trip |
| 2 | **Trip progress** | Arrived at pickup, picked up, completed |
| 3 | **Navigation / pickup** | Pickup address, customer location, ETA, traffic |
| 4 | **Customer contact** | Call customer (AI or bridge), SMS confirm, call summary |
| 5 | **Trip decisions** | Accept/reject new trip (outbound), cancel active trip |
| 6 | **Wait & timing** | Extend wait time at pickup, pickup reminder |
| 7 | **Incidents** | Customer no-show, safety/behavior/damage reports |
| 8 | **Earnings & stats** | Today’s income, rating, acceptance rate, bonuses |
| 9 | **Availability** | Go online / offline |
| 10 | **General FAQ** | How to use voice assistant, what AI can do (no tool) |

---

## Session types

### Inbound (driver-initiated)

Driver taps voice button in app → joins LiveKit room → `DriverAgent` with full tool set.

**Greeting:** *"Xin chào! Tôi là trợ lý AI của bạn. Tôi có thể giúp gì cho anh/chị?"*

### Outbound (system-initiated)

Trip-service dispatches agent to notify driver of a new assignment via SIP.

**Greeting:** Reads trip summary (customer, pickup, dropoff, time, ETA/traffic) and asks accept/reject.

---

## Response format rules

| Situation | Rule |
|-----------|------|
| Address | Summarize: *"Đón tại Nguyễn Huệ, quận 1"* — not full GPS string |
| Money | Round to VND, use *đ*: *"450 nghìn đ"* |
| Time | Relative when helpful: *"còn 12 phút nữa"* |
| Errors | Apologize briefly, suggest retry; do not expose HTTP/status codes |
| Unknown intent | Offer menu: schedule, call customer, earnings, report issue |

---

## Non-functional targets (thesis)

| Metric | Target |
|--------|--------|
| End-to-end voice latency (P50) | < 1.5s |
| Trip confirmation task success | > 90% |
| Driver satisfaction (1–5) | > 4.0 |
| FAQ answered without wrong tool | > 85% (manual eval) |

See `claude/knowledge.md` for full KPI list.
