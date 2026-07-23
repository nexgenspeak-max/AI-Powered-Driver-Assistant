# 00 — Tổng quan customer-web

> File này trả lời câu hỏi: **"customer-web là gì, gồm những gì?"**
> Đây là bản tách riêng cho `customer-web` từ bộ tài liệu chung [`../00_OVERVIEW.md`](../00_OVERVIEW.md) — xem file đó cho kiến trúc **toàn hệ thống** (backend, các app khác). File này chỉ nói về `customer-web`.

## App là gì

`customer-web` là web app dành cho **khách hàng** đặt xe: đặt chuyến, xem trạng thái chuyến, gọi tài xế/AI qua voicebot (LiveKit) — không cần cài app, mở trình duyệt là dùng được ngay.

| | |
|---|---|
| **Thư mục** | `src/frontend/customer-web` |
| **Stack** | React (web) |
| **Vai trò** | Web app khách hàng — đặt chuyến, gọi tài xế/AI qua voicebot |
| **Ngày thêm** | 2026-07-07 |
| **Song song với** | `customer-app` (mobile, Expo Router) — xem quyết định giữ song song 2 kênh tại [05_DECISIONS.md](05_DECISIONS.md) |

## Quan hệ với các phần khác

- Gọi API tới `trip-service` (đặt chuyến, lấy trạng thái) và `auth-service` (đăng nhập).
- Voicebot qua LiveKit dùng chung `voice-agent` (CustomerAgent) với `customer-app`.
- Nút "AI assistant" (chat text, khác voicebot) hiện gọi `src/frontend/customer-web/src/services/api/assistant.ts` — **đây là placeholder chưa nối LLM thật**, xem [FEAT-002](tickets/FEAT-002.md).

## Cách mở rộng file này

- Đổi stack/kiến trúc riêng của customer-web → sửa bảng trên.
- Thay đổi ảnh hưởng cả web lẫn mobile hoặc backend → ghi vào [`../00_OVERVIEW.md`](../00_OVERVIEW.md) (bản tổng), không lặp lại ở đây.
