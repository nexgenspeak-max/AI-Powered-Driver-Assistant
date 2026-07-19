# 03 — Tiến độ customer-app

> File này trả lời câu hỏi: **"customer-app đã làm đến đâu?"**
> Trạng thái các phần UI dùng chung — xem [`../driver/03_PROGRESS.md`](../driver/03_PROGRESS.md) (giống hệt, đồng bộ song song).

## Quy ước trạng thái

✅ Hoàn thành &nbsp;·&nbsp; 🔨 Đang làm &nbsp;·&nbsp; ⬜ Chưa bắt đầu &nbsp;·&nbsp; ⚠️ Hoàn thành nhưng có vấn đề/thiếu sót đã biết

## Trạng thái (riêng customer-app)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Đặt chuyến (BookingForm) | ✅ | Màu trạng thái đã chuẩn hoá theo token semantic. |
| Lịch sử chuyến (TripHistoryList) | ✅ | Padding/gap đã chuẩn hoá. |
| Theo dõi 1 chuyến (trip/[id]) | ✅ | Đã bổ sung `BackButton` còn thiếu. |
| Profile | ✅ | Badge "ONLINE"/"OFFLINE" căn giữa dưới tên (giống driver-app, không có khối thống kê vì `Customer` không có trường rating/trips). |
| Hệ thống liquid-glass UI, trợ lý AI, wake-word | ✅ / ⚠️ | Đồng bộ 100% với driver-app — xem [`../driver/03_PROGRESS.md`](../driver/03_PROGRESS.md). |
| Build native Android | ✅ | Sau khi sửa xung đột `expo-file-system` — [`../driver/tickets/BUG-M004.md`](../driver/tickets/BUG-M004.md). |

## Cách mở rộng file này

Giống quy ước tại [`../../web/03_PROGRESS.md`](../../web/03_PROGRESS.md).
