# 04 — Bug Tracker

> File này trả lời câu hỏi: **"Bug nào đang tồn tại?"**
> Khác với [`01_BACKLOG.md`](01_BACKLOG.md) (nghiệp vụ/feature mới), file này chỉ theo dõi **hành vi sai** so với kỳ vọng.

## Quy ước

- **ID**: `BUG-XXX`, đánh số tăng dần, không tái sử dụng.
- **Mức độ**: 🔴 Nghiêm trọng (mất chức năng/regression) / 🟡 Trung bình (sai hiển thị, không chặn luồng chính) / 🟢 Nhẹ (cosmetic).
- **Trạng thái**: 🆕 Mới phát hiện / 🔨 Đang sửa / ✅ Đã sửa / ❌ Không sửa (giải thích lý do).
- Bug đủ phức tạp (cần sửa nhiều file, cần điều tra) → tạo ticket trong `tickets/BUG-XXX.md`. Bug 1 dòng có thể ghi thẳng ở đây, cột "Ghi chú".

## Danh sách bug

| ID | Mô tả | Mức độ | Trạng thái | Ticket | Ghi chú |
|---|---|---|---|---|---|
| BUG-001 | Trạng thái trip lưu lẫn lộn uppercase (`ARRIVED_PICKUP`) và lowercase khiến UI admin-panel không khớp, hiển thị sai/thiếu trạng thái | 🟡 | 🔨 | [BUG-001](tickets/BUG-001.md) | Đang sửa dở (uncommitted): thêm `normalizeTripStatus()`, chuẩn hóa về lowercase |
| BUG-002 | call-center bản TypeScript viết lại làm rớt 2 tính năng bản Python cũ: (1) tóm tắt cuộc gọi bằng GPT-4o, (2) cập nhật trạng thái trip khi khách xác nhận/từ chối qua DTMF | 🔴 | 🆕 | [BUG-002](tickets/BUG-002.md) | Regression thật sự — chức năng từng chạy được (Python) nay chỉ còn `// TODO` |
| BUG-003 | `TripBoardPage.tsx` đếm thẻ thống kê (stat cards) theo danh sách trip đã lọc thay vì tổng toàn bộ → số liệu hiển thị sai khi có filter | 🟡 | ✅ | — | Đang sửa dở (uncommitted): đổi sang fetch `allTrips` không lọc, lọc riêng cho bảng |
| BUG-004 | Commit message `06e60a3` ("Develop the Prompt3D interface...") không khớp nội dung thực (JWT auth cho hệ thống ride-hailing) | 🟢 | 🆕 | — | Không ảnh hưởng chức năng, chỉ gây khó tra cứu lịch sử git — cân nhắc ghi chú lại thay vì sửa message đã push |
| BUG-005 | customer-web và driver-web chưa có responsive breakpoint cho iPad/điện thoại — UI hiện chỉ dựng cho desktop | 🟡 | ✅ | [BUG-005](tickets/BUG-005.md) | Phát hiện qua test thực tế trên thiết bị (không phải từ đọc code) |
| BUG-006 | Sau khi cuộc gọi bridge (driver↔customer qua AI) kết thúc, AI không quay lại điều khiển (handback thất bại) — dù đối phương tắt máy hay chính driver/customer ra lệnh ngắt, AI đều im lặng, không phản hồi nữa dù kết nối LiveKit vẫn còn | 🔴 | 🆕 | [BUG-006](tickets/BUG-006.md) | Xảy ra cả 2 chiều (driver gọi customer, customer gọi driver). Nghi liên quan `handback.py`/`sip_call_watch.py` đang sửa dở (uncommitted) |
| BUG-007 | `trip-service` không kiểm tra thứ tự chuyển trạng thái trip (cho phép nhảy cóc, ví dụ `pending`→`completed`) và không giới hạn 1 tài xế chỉ được `confirmed`/đang chạy 1 chuyến tại 1 thời điểm | 🔴 | 🆕 | [BUG-007](tickets/BUG-007.md) | Xác nhận trong code: `trips.ts` PATCH `/:tripId` chỉ check status hợp lệ + trip chưa ở trạng thái kết thúc, không check tuần tự/số chuyến đang chạy của tài xế |

## Cách mở rộng file này

- Phát hiện bug mới → thêm dòng với ID tiếp theo, trạng thái 🆕.
- Nếu cần điều tra/sửa nhiều bước → tạo `tickets/BUG-XXX.md` theo mẫu có sẵn trong thư mục `tickets/`.
- Khi sửa xong và đã commit → đổi trạng thái ✅, có thể ghi lại vào [02_WORK_LOG.md](02_WORK_LOG.md) ngày sửa xong. Không xóa dòng khỏi bảng.
