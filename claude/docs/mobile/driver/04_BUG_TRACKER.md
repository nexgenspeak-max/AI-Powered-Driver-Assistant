# 04 — Bug Tracker driver-app

> File này trả lời câu hỏi: **"Bug nào đang tồn tại/đã từng tồn tại trên driver-app?"**
> Quy ước ID/mức độ/trạng thái giống [`../../web/04_BUG_TRACKER.md`](../../web/04_BUG_TRACKER.md). Prefix `BUG-M` (Mobile) để không trùng số với `BUG-XXX` phía web/backend.

## Danh sách bug

| ID | Mô tả | Mức độ | Trạng thái | Ticket | Ghi chú |
|---|---|---|---|---|---|
| BUG-M001 | "Trợ lý rảnh tay" (wake-word) không nghe được từ khoá sau vài lần thử trên emulator | 🔴 | ⚠️ Đã giải thích, chưa xác nhận trên máy thật | [BUG-M001](tickets/BUG-M001.md) | Giới hạn đã biết của Android Emulator, không phải bug code — xem ticket |
| BUG-M002 | Hiệu ứng "giọt nước" bằng Skia shader tự viết vẽ quả cầu trắng khổng lồ đè lên Card, tràn khung | 🔴 | ✅ Đã sửa (đổi hướng kỹ thuật) | [BUG-M002](tickets/BUG-M002.md) | Bỏ hoàn toàn Skia, chuyển sang `GlassMaterial` (BlurView+LinearGradient+MaskedView) |
| BUG-M003 | `BackButton`: view chứa shadow không có `borderRadius` khớp với view hiển thị (bo tròn) bên trong → góc vuông lộ ra sau nút tròn | 🟡 | ✅ | [BUG-M003](tickets/BUG-M003.md) | |
| BUG-M004 | Build Android `customer-app` thất bại (`Plugin with id 'maven' not found`) do 2 bản `expo-file-system` khác nhau trong `node_modules` | 🔴 | ✅ | [BUG-M004](tickets/BUG-M004.md) | |
| BUG-M005 | Viền gradient của `GlassSheen` tạo điểm sáng nhọn ở góc bo nhỏ của `Card` | 🟡 | ✅ | [BUG-M005](tickets/BUG-M005.md) | |
| BUG-M006 | `borderRadius={999}` (mẹo "auto pill") không đáng tin cậy khi đi qua `MaskedView` | 🟡 | ✅ | [BUG-M006](tickets/BUG-M006.md) | |
| BUG-M007 | Nút "Accept" tràn ra ngoài card trong hàng Reject/Accept (prop `full` không lan tới view bọc `GestureDetector`) | 🔴 | ✅ | [BUG-M007](tickets/BUG-M007.md) | |
| BUG-M008 | Quả cầu 3D (`AssistantAvatar`) không đổi kích thước sau khi sửa `SIZE` — chỉ đẩy layout xuống | 🟡 | ✅ (giải thích) | [BUG-M008](tickets/BUG-M008.md) | Do Fast Refresh giữ context WebGL cũ, không phải lỗi code |
| BUG-M010 | Gọi khách hàng/danh bạ (voice-agent): cả 3 chế độ AI trả lời tốt, nhưng tóm tắt/trạng thái sau cuộc gọi báo sai (báo "đang gọi"/"không liên lạc được" dù cuộc gọi đã xong và khách đã nói chuyện đầy đủ), LiveKit vẫn hiện ACTIVE dù đã báo kết thúc | 🔴 | ✅ | [BUG-M010](tickets/BUG-M010.md) | 4 nguyên nhân độc lập cộng dồn — xem ticket. Kèm thêm tính năng mới: tự động tóm tắt khi cuộc gọi nền kết thúc, không cần tài xế hỏi |

## Cách mở rộng file này

Giống quy ước tại [`../../web/04_BUG_TRACKER.md`](../../web/04_BUG_TRACKER.md).
