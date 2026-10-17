# Driver Bot — Scenario Inventory

Complete list of scenarios the **driver voice agent** is designed to handle.  
Use this file for thesis evaluation, manual test planning, and coverage tracking.

**Last updated:** 2026-07-05  
**Agent:** `DriverAgent` (`app/voicebot/vn/` + `app/voicebot/en/`)  
**Related docs:** [faq-driver-vi.md](./faq-driver-vi.md) · [conversation-flows.md](./conversation-flows.md) · [capability-matrix.md](./capability-matrix.md)

---

## Summary

| Layer | Count | Description |
|-------|------:|-------------|
| **Support categories** | **10** | High-level domains (trip, earnings, incidents, …) |
| **Driver tools** | **19** | 17 inbound + 2 outbound-only |
| **FAQ utterance scenarios** | **66** | Individual sample phrases (T01–T84, G01–G06, O01–O04) |
| **Multi-step conversation flows** | **8** | F1–F8 (call customer, cancel, no-show, …) |
| **System / edge scenarios** | **6** | Silence, API failure, unknown intent, no active trip, … |
| **Out of scope (explicitly not handled)** | **7+** | Payment, legal, navigation, … |

### Total driver scenarios (testable)

| Type | Count |
|------|------:|
| Single-turn tool scenarios (FAQ IDs) | 66 |
| Multi-step flows | 8 |
| System / edge cases | 6 |
| **Grand total (distinct test cases)** | **~80** |

> **Note:** Many FAQ IDs share the same tool (e.g. T01–T04 → `check_upcoming_trips`).  
> For tool coverage, the bot implements **37 inbound tools** (see capability-matrix.md) across **10 categories**; the 19 listed here are the FAQ-mapped core.

---

## Session types

| # | Scenario | Room pattern | Tools available |
|---|----------|--------------|-----------------|
| S1 | **Inbound** — driver opens app, taps mic | `driver-{phone}-{ts}` | All 17 inbound tools |
| S2 | **Outbound** — system calls driver for new trip | `trip-{id}` (SIP) | `confirm_trip`, `reject_trip` + read trip from room metadata |

---

## 10 support categories → tools

| # | Category | Tools | FAQ IDs |
|---|----------|-------|---------|
| 1 | Trip schedule | `check_upcoming_trips` | T01–T05 |
| 2 | Trip progress | `update_trip_status` | T10–T15 |
| 3 | Pickup / location | `get_customer_location` | T20–T23 |
| 4 | Customer contact | `call_customer`, `summarize_last_call`, `confirm_trip_with_customer` | T30–T36 |
| 5 | Trip decisions | `confirm_trip`, `reject_trip`, `request_cancel_trip`, `confirm_cancel_trip` | T40–T46, O01–O02 |
| 6 | Wait & timing | `extend_wait_time`, `create_reminder` | T50–T54 |
| 7 | Incidents | `report_customer_no_show`, `report_trip_issue` | T60–T67 |
| 8 | Earnings & stats | `get_today_earnings`, `get_driver_stats`, `get_bonus_info` | T70–T78 |
| 9 | Availability | `set_driver_status` | T80–T84 |
| 10 | General FAQ (playbook RAG) | `answer_app_faq` | G01–G06 + playbook topics |

---

## Scenario list by category

### 1. Trip schedule (5 scenarios)

| ID | Sample (VI) | Sample (EN) | Tool |
|----|-------------|-------------|------|
| T01 | "Chuyến tiếp theo của tôi là gì?" | "What's my next trip?" | `check_upcoming_trips` |
| T02 | "Hôm nay tôi còn mấy chuyến?" | "How many trips do I have today?" | `check_upcoming_trips` |
| T03 | "Tôi có chuyến nào sắp tới không?" | "Do I have any upcoming trips?" | `check_upcoming_trips` |
| T04 | "Cho tôi xem lịch chuyến." | "Show my schedule." | `check_upcoming_trips` |
| T05 | "Chuyến hiện tại của tôi thế nào?" | — | `check_upcoming_trips` (prefetch context) |

---

### 2. Trip status updates (6 scenarios)

| ID | Sample (VI) | Status | Tool |
|----|-------------|--------|------|
| T10 | "Tôi đến nơi rồi." | `ARRIVED_PICKUP` | `update_trip_status` |
| T11 | "Đang chờ khách ở điểm đón." | `ARRIVED_PICKUP` | `update_trip_status` |
| T12 | "Khách đã lên xe." | `PICKED_UP` | `update_trip_status` |
| T13 | "Đón khách xong rồi." | `PICKED_UP` | `update_trip_status` |
| T14 | "Xong chuyến rồi." | `COMPLETED` | `update_trip_status` |
| T15 | "Đã trả khách." | `COMPLETED` | `update_trip_status` |

---

### 3. Pickup location (4 scenarios)

| ID | Sample (VI) | Tool |
|----|-------------|------|
| T20 | "Khách đứng ở đâu?" | `get_customer_location` |
| T21 | "Điểm đón ở đâu?" | `get_customer_location` |
| T22 | "Địa chỉ đón là gì?" | `get_customer_location` |
| T23 | "Tôi cần đến chỗ nào?" | `get_customer_location` |

---

### 4. Customer contact (7 scenarios)

| ID | Sample (VI) | Tool | Flow |
|----|-------------|------|------|
| T30 | "Gọi cho khách giúp tôi." | `call_customer` | **F1** — driver's saved default mode, no prompt |
| T31 | "Cho tôi nói chuyện với khách." | `call_customer` → `bridge` | F1 |
| T32 | "Để AI gọi và tóm tắt lại." | `call_customer` → `agent` | F1 → summarize |
| T33 | "Cuộc gọi vừa rồi khách nói gì?" | `summarize_last_call` | |
| T34 | "Tóm tắt cuộc gọi giúp tôi." | `summarize_last_call` | |
| T35 | "Nhắn tin báo khách tôi đang đến." | `confirm_trip_with_customer` | SMS stub |
| T36 | "Xác nhận với khách là tôi sắp tới." | `confirm_trip_with_customer` | |

---

### 5. Accept / reject / cancel (7 scenarios)

| ID | Sample (VI) | Tool | Mode |
|----|-------------|------|------|
| T40 | "Có, tôi nhận." | `confirm_trip` | Outbound **F5** |
| T41 | "Ok, nhận chuyến." | `confirm_trip` | Outbound |
| T42 | "Không, tôi bận." | `reject_trip` | Outbound |
| T43 | "Từ chối chuyến này." | `reject_trip` | Outbound |
| T44 | "Tôi muốn hủy chuyến." | `request_cancel_trip` | **F2** step 1 |
| T45 | "Hủy chuyến đi." | `request_cancel_trip` | F2 step 1 |
| T46 | "Có, hủy đi." | `confirm_cancel_trip` | F2 step 2 |

---

### 6. Wait time & reminders (5 scenarios)

| ID | Sample (VI) | Tool |
|----|-------------|------|
| T50 | "Cho tôi chờ thêm 5 phút." | `extend_wait_time` |
| T51 | "Gia hạn thời gian chờ." | `extend_wait_time` |
| T52 | "Khách chưa ra, tôi cần chờ thêm." | `extend_wait_time` |
| T53 | "Nhắc tôi trước 10 phút giờ đón." | `create_reminder` |
| T54 | "Đặt nhắc nhở trước giờ đón." | `create_reminder` |

---

### 7. Incidents (8 scenarios)

| ID | Sample (VI) | Tool | Issue type |
|----|-------------|------|------------|
| T60 | "Khách không ra." | `report_customer_no_show` | **F3** |
| T61 | "Đợi mãi không thấy khách." | `report_customer_no_show` | F3 |
| T62 | "Khách vắng mặt." | `report_customer_no_show` | F3 |
| T63 | "Khách hành xử không tốt." | `report_trip_issue` | `inappropriate_behavior` |
| T64 | "Địa chỉ sai." | `report_trip_issue` | `wrong_address` |
| T65 | "Có vấn đề an toàn." | `report_trip_issue` | `safety_concern` |
| T66 | "Xe bị hỏng trong chuyến." | `report_trip_issue` | `vehicle_damage` |
| T67 | "Tôi muốn báo cáo sự cố." | `report_trip_issue` | **F4** — ask type |

---

### 8. Earnings & stats (9 scenarios)

| ID | Sample (VI) | Tool |
|----|-------------|------|
| T70 | "Hôm nay tôi kiếm được bao nhiêu?" | `get_today_earnings` |
| T71 | "Thu nhập hôm nay thế nào?" | `get_today_earnings` |
| T72 | "Tôi chạy được mấy chuyến hôm nay?" | `get_today_earnings` |
| T73 | "Điểm đánh giá của tôi bao nhiêu?" | `get_driver_stats` |
| T74 | "Rating của tôi?" | `get_driver_stats` |
| T75 | "Tỷ lệ chấp nhận chuyến?" | `get_driver_stats` |
| T76 | "Hôm nay có thưởng không?" | `get_bonus_info` |
| T77 | "Vùng tăng giá ở đâu?" | `get_bonus_info` |
| T78 | "Có khuyến mãi / bonus không?" | `get_bonus_info` |

---

### 9. Availability (5 scenarios)

| ID | Sample (VI) | Tool |
|----|-------------|------|
| T80 | "Bật nhận chuyến." | `set_driver_status` → online |
| T81 | "Tôi sẵn sàng nhận chuyến." | `set_driver_status` → online |
| T82 | "Tắt nhận chuyến." | `set_driver_status` → offline |
| T83 | "Tôi nghỉ ca." | `set_driver_status` → offline |
| T84 | "Đi offline." | `set_driver_status` → offline |

---

### 10. General FAQ — playbook RAG (6+ scenarios)

| ID | Sample question | Handler |
|----|-----------------|---------|
| G01 | "Bạn có thể giúp gì?" | `answer_app_faq` / LLM |
| G02 | "Làm sao để gọi khách?" | `answer_app_faq` |
| G03 | "Làm sao hủy chuyến?" | `answer_app_faq` |
| G04 | "Khách không ra thì làm gì?" | `answer_app_faq` |
| G05 | "An toàn khi dùng giọng nói?" | `answer_app_faq` |
| G06 | "Bạn có lưu cuộc gọi không?" | `answer_app_faq` |

Additional playbook topics (RAG, no fixed ID): app overview, how to use voice assistant, driver features list, customer features, admin features, safety tips.

---

### 11. Outbound SIP — new trip notification (4 scenarios)

| ID | Sample | Tool / behavior |
|----|--------|-----------------|
| O01 | "Nhận." / "Có." / "Ok." | `confirm_trip` — **F5** |
| O02 | "Không nhận." / "Bận." | `reject_trip` — F5 |
| O03 | "Điểm đón ở đâu?" (during outbound call) | Read trip metadata — no tool |
| O04 | "Bao lâu nữa đến?" | ETA from trip metadata |

---

## Multi-step conversation flows (8)

| Flow | Name | Steps | Tools involved |
|------|------|-------|----------------|
| **F1** | Call customer | Ask mode → dial → optional summary | `call_customer`, `summarize_last_call` |
| **F2** | Cancel trip | Request → confirm / abort | `request_cancel_trip`, `confirm_cancel_trip` |
| **F3** | Customer no-show | Optional extend/call → confirm → report | `extend_wait_time`, `call_customer`, `report_customer_no_show` |
| **F4** | Report trip issue | Ask issue type → submit | `report_trip_issue` |
| **F5** | Outbound new trip | Greet + read trip → accept / reject | `confirm_trip`, `reject_trip` |
| **F6** | Silence / no input | 15s threshold → prompt → max 3 → end | `SilenceTracker` |
| **F7** | API failure | Tool error → generic retry message | All tools |
| **F8** | Unknown intent | Offer 3–4 capability options | LLM only |

---

## Follow-up chains (common multi-turn)

| After answering… | Driver often asks… | Next tool |
|------------------|-------------------|-----------|
| Trip schedule | "Gọi khách được không?" | `call_customer` |
| Pickup location | "Gọi khách giúp tôi" | `call_customer` |
| Pickup location | "Nhắn tin cho khách" | `confirm_trip_with_customer` |
| AI call (agent mode) | "Tóm tắt cuộc gọi" | `summarize_last_call` |
| Waiting at pickup | "Khách không ra" | `report_customer_no_show` |
| Earnings | "Có bonus không?" | `get_bonus_info` |

---

## System & edge scenarios (6)

| # | Scenario | Expected behavior |
|---|----------|-------------------|
| E1 | No active trip (location / call / cancel) | *"Anh/chị chưa có chuyến đang hoạt động."* |
| E2 | Prefetch empty / API down at session start | Greeting works; tools return graceful error |
| E3 | Backend down mid-session | F7 — no invented data |
| E4 | Driver silent 15s × 3 | F6 — prompt then end (prod) |
| E5 | Second call while one active | Refuse — do not start duplicate call |
| E6 | Cancel confirmation declined ("Không") | Clear pending; no API call |

---

## Out of scope — NOT handled by driver bot

See [out-of-scope.md](./out-of-scope.md). Summary:

| Topic | Example |
|-------|---------|
| Payment disputes | "Khách không trả tiền" |
| Account / password | "Quên mật khẩu" |
| Legal / insurance | "Tai nạn, cần bảo hiểm" |
| Profile changes | "Đổi biển số xe" |
| Turn-by-turn navigation | "Rẽ trái ở đâu" |
| Other platforms | "Chuyến Grab khác" |
| Customer refunds | "Hoàn tiền cho khách" |

---

## Tool → scenario quick reference

| Tool | # FAQ IDs | Session |
|------|----------:|---------|
| `check_upcoming_trips` | 5 | Inbound |
| `update_trip_status` | 6 | Inbound |
| `get_customer_location` | 4 | Inbound |
| `call_customer` | 3 | Inbound |
| `summarize_last_call` | 2 | Inbound |
| `confirm_trip_with_customer` | 2 | Inbound |
| `confirm_trip` | 2 + O01 | Outbound |
| `reject_trip` | 2 + O02 | Outbound |
| `request_cancel_trip` | 2 | Inbound |
| `confirm_cancel_trip` | 1 | Inbound |
| `extend_wait_time` | 3 | Inbound |
| `create_reminder` | 2 | Inbound |
| `report_customer_no_show` | 3 | Inbound |
| `report_trip_issue` | 5 | Inbound |
| `get_today_earnings` | 3 | Inbound |
| `get_driver_stats` | 3 | Inbound |
| `get_bonus_info` | 3 | Inbound |
| `set_driver_status` | 5 | Inbound |
| `answer_app_faq` | 6+ | Inbound |

---

## Manual test checklist (minimum)

- [ ] **S1** Inbound greeting + prefetch loads context
- [ ] **T01–T05** Schedule read (no extra API latency)
- [ ] **T10–T15** Status update + local context patch
- [ ] **F1** Call customer (bridge + agent modes)
- [ ] **F2** Cancel two-step flow
- [ ] **F3** No-show with confirmation
- [ ] **F5** Outbound accept / reject
- [ ] **T70–T78** Earnings / stats / bonus from prefetch
- [ ] **G01** FAQ via RAG
- [ ] **E1, F7** Error handling — no hallucinated data

---

## Customer agent (separate — not driver)

For completeness, these are **customer** scenarios (different agent):

| Tool | Purpose |
|------|---------|
| `get_my_trip` | Trip status for passenger |
| `get_driver_eta` | Driver ETA |
| `cancel_my_trip` | Customer cancels trip |
| `answer_app_faq` | Customer playbook FAQ |

Driver bot does **not** handle customer-specific scenarios above.
