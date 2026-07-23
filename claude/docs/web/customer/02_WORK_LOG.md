# 02 — Nhật ký công việc customer-web

> File này trả lời câu hỏi: **"Ai đã làm gì trên customer-web, khi nào?"**
> Bản tách riêng từ [`../02_WORK_LOG.md`](../02_WORK_LOG.md), chỉ giữ entry liên quan `customer-web`. Quy ước ghi log giống file gốc — mới nhất lên đầu.

---

### 2026-07-19 — Tách tài liệu customer-web/driver-web ra thư mục riêng
- Tách bộ tài liệu `docs/web/` (dùng chung customer-web + driver-web) thành `docs/web/customer/` và `docs/web/driver/`, mỗi bên giữ nguyên format 6 file + `tickets/`.
- Không đổi code, chỉ tổ chức lại tài liệu.

### 2026-07-07 — Customer đặt chuyến + gọi tài xế qua voicebot
- Commit `57e957c`.
- Thêm luồng đặt chuyến từ phía khách hàng qua customer-web, gọi tài xế qua voice-agent (SIP bridge).
- (Ghi lại hồi tố từ git log — chi tiết đầy đủ có thể không đầy đủ vì không có log gốc tại thời điểm làm.)

## Cách mở rộng file này

Giống quy ước tại [`../02_WORK_LOG.md`](../02_WORK_LOG.md).
