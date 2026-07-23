# 00 — Tổng quan customer-app

> File này trả lời câu hỏi: **"customer-app là gì, gồm những gì?"**
> `customer-app` dùng chung gần như toàn bộ hệ thống UI với `driver-app` — xem [`../driver/00_OVERVIEW.md`](../driver/00_OVERVIEW.md) cho chi tiết kiến trúc UI dùng chung (liquid-glass, design system, trợ lý AI). File này chỉ nêu phần **riêng** của `customer-app`. Xem [`../../web/00_OVERVIEW.md`](../../web/00_OVERVIEW.md) cho kiến trúc toàn hệ thống.

## App là gì

`customer-app` là app mobile (Expo Router) cho **khách hàng**: đặt chuyến, xem lịch sử/trạng thái chuyến, nói chuyện với trợ lý AI qua giọng nói (LiveKit) hoặc "trợ lý rảnh tay" (wake-word).

| | |
|---|---|
| **Thư mục** | `src/frontend/customer-app` |
| **Stack** | Giống hệt `driver-app` — Expo Router (SDK 54), Tamagui, Zustand, React Query, Reanimated 4 |
| **Song song với** | `customer-web` — xem [`../../web/customer/05_DECISIONS.md`](../../web/customer/05_DECISIONS.md) |

## Kiến trúc UI dùng chung với driver-app

Toàn bộ `src/components/` (`Card`, `Badge`, `Button`, `BackButton`, `Input`, `LiquidGlass/`, `GlassTabButton`), `tamagui.config.ts`, và các trang `about`/`faq`/`login`/`register` — **giống hệt driver-app**, được đồng bộ song song trong suốt phiên làm việc 2026-07-19. Xem [`../driver/00_OVERVIEW.md`](../driver/00_OVERVIEW.md) và [02_WORK_LOG.md](02_WORK_LOG.md) cho chi tiết.

## Nghiệp vụ riêng của customer-app (không có ở driver-app)

- `src/features/booking/` — form đặt chuyến (`BookingForm`).
- `src/features/trips/` — lịch sử chuyến (`TripHistoryList`, `TripHistoryItem`), theo dõi trạng thái 1 chuyến (`TripStatusCard`, route `trip/[id]`).

> Ngược lại, `driver-app` có `dashboard` (nhận/xử lý chuyến), `earnings` (thu nhập), `VehicleTypeSelect` — không có ở `customer-app` vì không phải nghiệp vụ của khách hàng.

## Cách mở rộng file này

- Thay đổi ảnh hưởng cả 2 app (UI dùng chung) → ghi vào [`../driver/00_OVERVIEW.md`](../driver/00_OVERVIEW.md), trỏ link từ đây.
- Thêm nghiệp vụ riêng của customer-app → thêm vào mục "Nghiệp vụ riêng".
