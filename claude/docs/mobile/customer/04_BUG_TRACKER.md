# 04 — Bug Tracker customer-app

> File này trả lời câu hỏi: **"Bug nào đang tồn tại/đã từng tồn tại trên customer-app?"**
> Gần như toàn bộ bug UI dùng chung (Skia vỡ layout, góc bo, MaskedView, nút tràn khung...) xảy ra và được sửa **đồng thời trên cả 2 app** — xem bảng đầy đủ tại [`../driver/04_BUG_TRACKER.md`](../driver/04_BUG_TRACKER.md). File này chỉ ghi bug **riêng** của customer-app.

## Danh sách bug riêng

| ID | Mô tả | Mức độ | Trạng thái | Ticket | Ghi chú |
|---|---|---|---|---|---|
| BUG-M004 | Build Android thất bại do 2 bản `expo-file-system` khác nhau trong `node_modules` | 🔴 | ✅ | [`../driver/tickets/BUG-M004.md`](../driver/tickets/BUG-M004.md) | Không xảy ra ở driver-app (đã khai báo dependency trực tiếp từ trước) |
| BUG-M009 | Màn `trip/[id]` (Trip Status) không có `BackButton`, khác với `about`/`faq` cùng là màn pushed | 🟡 | ✅ | [BUG-M009](tickets/BUG-M009.md) | Phát hiện qua rà soát layout, không phải người dùng báo |

## Cách mở rộng file này

Giống quy ước tại [`../../web/04_BUG_TRACKER.md`](../../web/04_BUG_TRACKER.md).
