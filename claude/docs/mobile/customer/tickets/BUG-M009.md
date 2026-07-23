# BUG-M009 — Màn Trip Status thiếu nút quay lại

| | |
|---|---|
| **Loại** | Bug |
| **Service** | customer-app (`app/(app)/trip/[id].tsx`, `src/features/trips/components/TripStatusCard.tsx`) |
| **Mức độ** | 🟡 Trung bình |
| **Trạng thái** | ✅ Đã sửa |
| **Liên quan** | [04_BUG_TRACKER.md](../04_BUG_TRACKER.md) |

## Mô tả

Màn "Trip Status" (`trip/[id]`) là màn hình pushed (điều hướng tới từ `BookingForm`/`TripHistoryItem`), cùng loại với `about`/`faq` — nhưng không render `<BackButton />`, khiến người dùng không có cách quay lại bằng nút bấm (chỉ có gesture back của hệ điều hành).

## Việc đã làm

- Thêm `<BackButton />` vào `trip/[id].tsx`, tái cấu trúc màn hình thành 1 `View` bọc ngoài chung cho cả 3 nhánh (loading/error/thành công) thay vì mỗi nhánh tự return riêng.
- Cập nhật `TripStatusCard`'s `paddingTop` dùng `getBackButtonClearance(insets.top)` (thay vì số cứng `64`) để nội dung không bị nút back đè lên.

## Ghi chú

Phát hiện qua rà soát layout toàn diện (Explore agent), không phải người dùng báo cáo trực tiếp.
