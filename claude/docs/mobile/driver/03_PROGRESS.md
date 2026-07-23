# 03 — Tiến độ driver-app

> File này trả lời câu hỏi: **"driver-app đã làm đến đâu?"**

## Quy ước trạng thái

✅ Hoàn thành &nbsp;·&nbsp; 🔨 Đang làm &nbsp;·&nbsp; ⬜ Chưa bắt đầu &nbsp;·&nbsp; ⚠️ Hoàn thành nhưng có vấn đề/thiếu sót đã biết

## Trạng thái

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Đăng nhập/đăng ký | ✅ | Dùng `<Card>` dùng chung, có shadow đúng spec. |
| Dashboard (nhận/xử lý chuyến) | ✅ | Nút Reject/Accept xếp dọc, full-width bằng nút "Arrived at Pickup". |
| Earnings (thu nhập) | ✅ | Token màu semantic đã chuẩn hoá. |
| Profile | ✅ | Badge trạng thái "ONLINE"/"OFFLINE" căn giữa dưới tên. |
| Trợ lý AI (chat + giọng nói) | ✅ | Quả cầu 3D căn giữa, kích thước 360, chat qua LiveKit hoạt động. |
| Trợ lý rảnh tay (wake-word) | ⚠️ | Code chạy đúng (model load, recognizer khởi động, grammar đúng) nhưng **chưa xác nhận được trên điện thoại thật** — mọi test trên emulator đều gặp giới hạn AudioRecord đã biết của Android Emulator, xem [BUG-M001](tickets/BUG-M001.md). |
| Hệ thống liquid-glass UI (Card/Badge/Button/BackButton/TabBar) | ✅ | Đã bỏ hướng Skia (vỡ), chuyển sang `GlassMaterial`/`GlassSheen` (BlurView+LinearGradient+MaskedView) theo đúng tham khảo `linear-tab-bar`. |
| Build native Android | ✅ | Đã build thành công với các thư viện mới (gesture-handler, masked-view, react-native-svg). |

## Cách mở rộng file này

Giống quy ước tại [`../../web/03_PROGRESS.md`](../../web/03_PROGRESS.md).
