# BUG-M006 — `borderRadius={999}` không đáng tin cậy qua MaskedView

| | |
|---|---|
| **Loại** | Bug |
| **Service** | driver-app, customer-app (`Button.tsx`, `Badge.tsx`) |
| **Mức độ** | 🟡 Trung bình (cosmetic) |
| **Trạng thái** | ✅ Đã sửa |
| **Liên quan** | [04_BUG_TRACKER.md](../04_BUG_TRACKER.md) |

## Mô tả

Mẹo thường dùng "đặt `borderRadius: 999` để RN tự động bo thành hình pill/viên thuốc" hoạt động tốt với `View` bình thường (RN tự clamp về `min(width,height)/2`), nhưng khi giá trị này được truyền tiếp vào `maskElement` của `MaskedView` (dùng để vẽ viền gradient), việc clamp không đáng tin cậy như nhau giữa các nền tảng — biểu hiện ra là góc nhọn/lệch bất thường ở viền (báo cáo qua ảnh chụp thực tế trên thiết bị).

## Việc đã làm

Bỏ hẳn giá trị `999` — luôn truyền bán kính **thật, đã đo được**:
- `Button`: đo `size.height` qua `onLayout`, truyền `borderRadius={size.height / 2}`.
- `Badge`: thêm lại `onLayout`/`useState` để đo `height`, truyền `borderRadius={height / 2}`.
- Thanh input chat (`AssistantChatPanel`): `height={48}` là hằng số cố định → truyền thẳng `borderRadius={24}`, không cần đo.

## Ghi chú

Bài học chung: tránh dùng "số ảo" (sentinel value) dựa vào hành vi tự động-clamp của 1 platform cụ thể khi giá trị đó còn đi qua 1 lớp xử lý khác (ở đây là mask rasterization) — luôn tính giá trị thật khi có thể.
