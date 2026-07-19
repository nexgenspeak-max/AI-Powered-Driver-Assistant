# BUG-M002 — Hiệu ứng liquid-glass bằng Skia shader vỡ layout trên thiết bị thật

| | |
|---|---|
| **Loại** | Bug (dẫn tới đổi hướng kỹ thuật) |
| **Service** | driver-app, customer-app (`src/components/LiquidGlass.tsx` — đã bị xoá) |
| **Mức độ** | 🔴 Nghiêm trọng (vỡ giao diện toàn bộ Card) |
| **Trạng thái** | ✅ Đã sửa — bằng cách đổi hoàn toàn kỹ thuật |
| **Liên quan** | [04_BUG_TRACKER.md](../04_BUG_TRACKER.md), [05_DECISIONS.md](../05_DECISIONS.md) |

## Mô tả

Sau khi build native lại và test trên thiết bị/emulator thật, các `Card` (Today's Earnings, Last 7 days, Active bonuses...) hiển thị **quả cầu trắng khổng lồ** đè lên chữ, tràn ra ngoài cả khung card — trước đó chỉ verify bằng `tsc --noEmit` và `expo export --platform web`, không phát hiện được vì đây là lỗi hiển thị runtime trên native, không phải lỗi type/build.

## Nguyên nhân

`useStaticLiquidBlobs()` tính bán kính quả cầu (metaball) dựa trên `minDim = Math.min(width, height)` của cả khối `Card` (bao gồm nhiều dòng `InfoRow` bên trong). Với card **nhiều dòng** (cao), `minDim` chính là chiều cao (rất lớn với 1 card 3-4 dòng), khiến bán kính blob tính ra khổng lồ so với 1 dòng riêng lẻ — không hề tương ứng với ý định ban đầu (1 quầng sáng nhỏ, tinh tế).

## Việc đã làm

- Xoá hoàn toàn shader Skia tự viết (SDF + smooth-min metaball) và mọi state/hook liên quan (`useStaticLiquidBlobs`, `useLiquidPress` bản Skia, `LiquidGlassOverlay`, `AmbientGlassRim`).
- Đọc kỹ repo tham khảo [SchroederNathan/linear-tab-bar](https://github.com/SchroederNathan/linear-tab-bar), viết lại toàn bộ theo kỹ thuật của họ: `BlurView` thật + `LinearGradient` phủ nhẹ + viền gradient qua `MaskedView` — không cần tính toán hình học nào, tự động đúng với mọi kích thước container.
- Xem chi tiết quyết định tại [05_DECISIONS.md](../05_DECISIONS.md).

## Bài học

Thay đổi UI chỉ chạy đúng trên native (Skia, GLView, native module...) **không thể verify chỉ bằng typecheck/web export** — bắt buộc phải build native và xem trực tiếp trên thiết bị/emulator trước khi báo "xong".
