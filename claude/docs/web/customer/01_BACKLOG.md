# 01 — Backlog customer-web

> File này trả lời câu hỏi: **"customer-web còn những việc gì cần làm?"**
> Bản tách riêng từ [`../01_BACKLOG.md`](../01_BACKLOG.md) — chỉ giữ lại các mục liên quan trực tiếp tới `customer-web`. Quy ước ID/ưu tiên/trạng thái giống hệt file gốc.

## Đang mở

| ID | Mô tả | Ưu tiên | Trạng thái | Ticket |
|---|---|---|---|---|
| FEAT-002 | Nối LLM thật (Anthropic/OpenAI/Gemini) cho nút "AI assistant", hiện là placeholder | 🟡 Trung bình | ⬜ | [FEAT-002](tickets/FEAT-002.md) |
| FEAT-005 | Chốt quan hệ giữa `customer-app` (mobile) và `customer-web`: giữ song song hay ngưng 1 bên | 🟡 Trung bình | ⬜ | — (đã có quyết định tạm, xem [05_DECISIONS.md](05_DECISIONS.md)) |
| BUG-005 | Chưa có breakpoint responsive cho iPad/điện thoại | 🟡 Trung bình | ✅ | [BUG-005](tickets/BUG-005.md) |

## Đã hoàn thành

| ID | Mô tả | Ngày xong |
|---|---|---|
| — | Customer đặt chuyến + gọi tài xế qua voicebot | 2026-07-07 |

## Cách mở rộng file này

Giống quy ước tại [`../01_BACKLOG.md`](../01_BACKLOG.md). Việc ảnh hưởng cả `customer-web` lẫn `driver-web`/backend → ghi vào file gốc, không lặp ở 2 nơi.
