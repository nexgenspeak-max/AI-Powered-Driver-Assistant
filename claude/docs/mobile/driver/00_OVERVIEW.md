# 00 — Tổng quan driver-app

> File này trả lời câu hỏi: **"driver-app là gì, gồm những gì?"**
> Đây là app mobile chính thức cho tài xế — xem [`../../web/00_OVERVIEW.md`](../../web/00_OVERVIEW.md) cho kiến trúc **toàn hệ thống** (backend, các app web). File này chỉ nói về `driver-app`.

## App là gì

`driver-app` là app mobile (Expo Router) cho **tài xế**: nhận/xử lý chuyến, xem thu nhập, nói chuyện với trợ lý AI qua giọng nói (LiveKit) hoặc bằng cách bật "trợ lý rảnh tay" (wake-word, không cần chạm màn hình).

| | |
|---|---|
| **Thư mục** | `src/frontend/driver-app` |
| **Stack** | Expo Router (SDK 54), Tamagui, Zustand, React Query, React Native Reanimated 4 |
| **Song song với** | `driver-web` — xem [`../../web/driver/05_DECISIONS.md`](../../web/driver/05_DECISIONS.md) |

## Kiến trúc UI

- **Design system**: "Neo Glass + Soft Dark" — không viền, chỉ dùng shadow mềm để tạo chiều sâu; token màu/spacing định nghĩa tại `tamagui.config.ts` (giống hệt `customer-app`, xem [05_DECISIONS.md](05_DECISIONS.md)).
- **Liquid-glass component system** (`src/components/LiquidGlass/`): `GlassMaterial` (blur thật + gradient wash + viền gradient, dùng cho phần tử nổi trên nội dung tuỳ ý như `BackButton`/tab bar/thanh chat), `GlassSheen` (chỉ wash, không blur, dùng cho `Card`/`Badge`/`Button` đã có nền đặc), `useGlassPress` (gesture Pan+Tap tạo hiệu ứng co-giãn khi chạm), `GlowOverlay` (vệt sáng theo ngón tay). Port từ [SchroederNathan/linear-tab-bar](https://github.com/SchroederNathan/linear-tab-bar) — xem [05_DECISIONS.md](05_DECISIONS.md) cho lý do không dùng Skia shader.
- **Tab bar** (`app/(app)/_layout.tsx` + `src/components/GlassTabButton.tsx`): pill kính lỏng, co giãn theo ngón tay khi bấm.
- **Trợ lý AI** (`src/features/home/`): `AssistantChatPanel` (chat text + nút mic) + `AssistantAvatar` (quả cầu chấm 3D bằng Three.js, biến dạng theo âm lượng giọng nói AI qua `expo-gl`/`expo-three`).
- **Trợ lý rảnh tay / wake-word** (`src/features/assistant-wakeword/`): nghe liên tục từ khoá "xin chào" bằng Vosk (offline, model `vi-vn`) chạy nền qua foreground service Android; khi nhận diện đúng từ khoá → tự kết nối LiveKit. **Chỉ chạy trên Android** (`Platform.OS !== 'android'` thì no-op). Xem giới hạn khi test trên emulator tại [04_BUG_TRACKER.md](04_BUG_TRACKER.md).

## Nghiệp vụ riêng của driver-app (không có ở customer-app)

- `src/features/dashboard/` — nhận/từ chối/xử lý chuyến đang chạy (`TripCard`), bật/tắt online.
- `src/features/earnings/` — thu nhập hôm nay/7 ngày/30 ngày, bonus đang áp dụng.
- `VehicleTypeSelect` (đăng ký) — chọn loại xe.

## Cách mở rộng file này

- Đổi kiến trúc UI/component dùng chung → cập nhật mục "Kiến trúc UI" + xem `customer-app` có cần đồng bộ không (2 app dùng chung toàn bộ `src/components/` và style, xem [05_DECISIONS.md](05_DECISIONS.md)).
- Thêm nghiệp vụ mới → thêm vào mục "Nghiệp vụ riêng".
