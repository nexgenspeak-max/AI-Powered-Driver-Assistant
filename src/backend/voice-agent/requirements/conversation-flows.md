# Required Conversation Flows

Multi-step flows the AI must follow. Violations are considered bugs.

---

## F1 — Call customer (mandatory)

**Trigger:** Driver asks to contact customer (T30–T32)

```
Driver: "Gọi cho khách giúp tôi."
AI:     "Anh/chị muốn tôi tự gọi khách rồi tóm tắt (anh/chị vẫn hỏi việc khác được),
         tôi gọi và anh/chị nghe trực tiếp,
         hay kết nối để anh/chị nói với khách?"

Driver: "AI tự gọi / tóm tắt sau"  → call_customer(mode="background") — DriverAgent giữ nguyên
Driver: "AI gọi / tôi nghe"        → call_customer(mode="agent") → CustomerCallAgent handoff
Driver: "Kết nối trực tiếp"        → call_customer(mode="bridge") → BridgeCallAgent handoff

Driver: "Trợ lý kết thúc" / "cúp máy khách" → end_bridge_call (wake phrase — bridge mode)
Driver: "Gọi xong chưa?" / "Tóm tắt cuộc gọi" → check_customer_call_status / summarize_last_call (background)
[Khách cúp máy — tự động handback DriverAgent + tóm tắt ngắn]
[Quá 10 phút — tự động handback (BRIDGE_CALL_MAX_SECONDS)]

[After agent-mode call ends — AI calls end_customer_call or auto handback on SIP disconnect]
AI:     → summarize_last_call (on request) or resume_summary on handback
```

**Rules:**
- Never call `call_customer` without asking mode first (unless driver already specified).
- Do not start a second call while one is active.

---

## F2 — Cancel trip (two-step)

**Trigger:** T44–T46

```
Driver: "Hủy chuyến này."
AI:     → request_cancel_trip (stores pending trip id, asks confirmation)
        "Anh/chị chắc chắn muốn hủy chuyến [mã] không?"

Driver: "Có" / "Đồng ý"  → confirm_cancel_trip
Driver: "Không"           → clear pending, "Đã hủy thao tác."
```

**Rules:**
- Never skip confirmation step.
- Speak trip summary (customer, pickup) before confirming.

---

## F3 — Report customer no-show

**Trigger:** T60–T62

```
Driver: "Khách không ra."
AI:     "Anh/chị đã chờ bao lâu? Tôi có thể gia hạn thêm hoặc báo khách vắng mặt."
        [Optional: suggest extend_wait_time or call_customer first]

Driver confirms no-show → report_customer_no_show
AI:     "Đã ghi nhận khách vắng mặt. Chuyến sẽ được xử lý theo quy định."
```

---

## F4 — Report trip issue

**Trigger:** T63–T67

```
Driver: "Tôi muốn báo cáo sự cố."
AI:     Ask issue type if unclear:
        - An toàn (safety_concern)
        - Hành vi không phù hợp (inappropriate_behavior)
        - Xe hỏng (vehicle_damage)
        - Địa chỉ sai (wrong_address)
        - Khác (other)

→ report_trip_issue(issue_type, description)
```

---

## F5 — Outbound new trip notification

**Trigger:** System dispatches agent to `trip-{id}` room

```
AI:     Greet + read trip (customer, pickup, dropoff, time, ETA/traffic)
        "Anh/chị có nhận chuyến này không?"

Driver: accept → confirm_trip
Driver: decline → reject_trip
Driver: unclear → ask once more, then timeout / end
```

---

## F6 — Silence / no input

Handled by `SilenceTracker` (`app/services/silence_tracker.py`):

| Setting | Default (driver) |
|---------|------------------|
| Threshold | 15s |
| Max consecutive | 3 |
| Action | Prompt → end session (prod) |

Prompt example: *"Anh/chị còn cần hỗ trợ gì không?"*

---

## F7 — API failure

```
Tool returns error / exception
AI: "Hiện không lấy được thông tin. Anh/chị thử lại sau giúp tôi."
```

Do not invent trip data, earnings, or ETA.

---

## F8 — Unknown intent

```
AI: "Tôi có thể giúp anh/chị xem lịch chuyến, gọi khách, xem thu nhập,
     hoặc báo cáo sự cố. Anh/chị cần gì?"
```

Offer at most **3–4 options** in one sentence.
