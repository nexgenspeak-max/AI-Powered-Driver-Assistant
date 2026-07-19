# 00 — Tổng quan driver-web

> File này trả lời câu hỏi: **"driver-web là gì, gồm những gì?"**
> Đây là bản tách riêng cho `driver-web` từ bộ tài liệu chung [`../00_OVERVIEW.md`](../00_OVERVIEW.md) — xem file đó cho kiến trúc **toàn hệ thống** (backend, các app khác). File này chỉ nói về `driver-web`.

## App là gì

`driver-web` là web app (PWA) dành cho **tài xế**: xem/nhận chuyến, gọi khách/AI qua voicebot (LiveKit) — không cần cài app.

| | |
|---|---|
| **Thư mục** | `src/frontend/driver-web` |
| **Stack** | React (web), PWA |
| **Vai trò** | Web app tài xế |
| **Ngày thêm** | 2026-07-07 |
| **Song song với** | `driver-app` (mobile, Expo Router) — xem quyết định giữ song song 2 kênh tại [05_DECISIONS.md](05_DECISIONS.md) |

## Quan hệ với các phần khác

- Gọi API tới `trip-service` (nhận/cập nhật chuyến) và `auth-service` (đăng nhập).
- Voicebot qua LiveKit dùng chung `voice-agent` (DriverAgent) với `driver-app`.
- Nút "AI assistant" (chat text, khác voicebot) hiện gọi `src/frontend/driver-web/src/services/api/assistant.ts` — **placeholder chưa nối LLM thật**, xem [FEAT-002](tickets/FEAT-002.md).

## Cách mở rộng file này

- Đổi stack/kiến trúc riêng của driver-web → sửa bảng trên.
- Thay đổi ảnh hưởng cả web lẫn mobile hoặc backend → ghi vào [`../00_OVERVIEW.md`](../00_OVERVIEW.md) (bản tổng), không lặp lại ở đây.
