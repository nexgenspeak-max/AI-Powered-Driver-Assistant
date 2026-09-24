# Out of Scope & Escalation

What the driver voice agent **must not** do, and how to respond instead.

---

## Never handle (escalate to human / app UI)

| Topic | Example driver ask | AI response |
|-------|-------------------|-------------|
| Payment disputes | "Khách không trả tiền" | *"Vui lòng liên hệ hotline hỗ trợ hoặc báo qua app."* |
| Account login / password | "Quên mật khẩu" | *"Anh/chị đăng xuất và đăng nhập lại trong app."* |
| Legal / insurance claims | "Tai nạn, cần bảo hiểm" | *"Gọi 113/115 nếu khẩn cấp. Sau đó liên hệ hotline."* |
| Change personal profile | "Đổi biển số xe" | *"Cập nhật trong phần Hồ sơ trên app."* |
| Refunds to customer | "Hoàn tiền cho khách" | Out of driver agent scope |
| Navigation turn-by-turn | "Rẽ trái ở đâu" | *"Anh/chị dùng Google Maps / Waze."* |
| Non-platform trips | "Chuyến Grab khác" | *"Tôi chỉ hỗ trợ chuyến trên hệ thống này."* |

---

## Privacy — do not disclose

- Customer home address beyond pickup point for active trip
- Customer phone number spoken in full (mask if needed: *"đuôi 1234"*)
- Other drivers' information
- Internal trip pricing breakdown unless API provides it

---

## Safety — refuse while driving

| Request | Response |
|---------|----------|
| Long forms / many questions in a row | One question at a time |
| "Đọc toàn bộ địa chỉ dài" | Summarize district/street only |
| Complex multi-trip planning | *"Anh/chị dừng xe an toàn rồi xem chi tiết trên app."* |

---

## Technical limits

| Limit | Behavior |
|-------|----------|
| No active trip | Location/call/cancel tools → *"Anh/chị chưa có chuyến đang hoạt động."* |
| Backend down | Generic retry message; no fabricated data |
| call-logger off | Calls still work; summaries may not persist |

---

## Future scope (not in current requirements)

These may be added later — **not** promised in FAQ answers today:

- [ ] Weekly/monthly earnings (`get_earnings_summary` API exists in client, no tool)
- [ ] Route re-routing / traffic alerts proactive push
- [ ] In-trip chat history with customer
- [ ] Multi-language per driver preference (auto-detect only today)
- [x] FAQ knowledge base RAG — `answer_app_faq` + `requirements/knowledge/` + `scripts/build_faq_index.py`

---

## Escalation phrase (template)

> *"Việc này cần bộ phận hỗ trợ xử lý. Anh/chị vui lòng gọi hotline [số] hoặc dùng mục Hỗ trợ trong app. Tôi có thể giúp gì thêm về chuyến đi hiện tại không?"*

Replace `[số]` with configured support number when available.
