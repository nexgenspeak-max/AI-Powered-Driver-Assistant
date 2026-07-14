# 02 — Nhật ký công việc

> File này trả lời câu hỏi: **"Ai đã làm gì, khi nào?"**
> Ghi theo từng ngày, **mới nhất lên đầu**. Đây là log thao tác thực tế (đã làm gì, đụng vào file nào) — khác với [`03_PROGRESS.md`](03_PROGRESS.md) (tổng hợp trạng thái hiện tại) và [`05_DECISIONS.md`](05_DECISIONS.md) (lý do đằng sau các lựa chọn kỹ thuật).

## Quy ước ghi log

Mỗi entry gồm:
```
### YYYY-MM-DD — Tiêu đề ngắn
- Việc đã làm (gạch đầu dòng, ngắn gọn)
- File/service liên quan
- Liên kết ticket nếu có (FEAT-XXX / BUG-XXX)
```
Không cần ghi log cho việc quá nhỏ (sửa typo, format code). Ghi log cho: tính năng mới, sửa bug, đổi kiến trúc, đổi quyết định kỹ thuật.

---

### 2026-07-08 — Khởi tạo bộ tài liệu docs/ chuẩn hóa
- Rà soát toàn bộ dự án (`claude/*.md` cũ + git log + git diff hiện tại) để đối chiếu tài liệu vs thực tế code.
- Phát hiện `claude/*.md` cũ mô tả kiến trúc Python/Lambda đã lỗi thời ~6 tuần; thực tế đã chuyển sang TypeScript/Express (trừ voice-agent vẫn Python) và có thêm auth-service, customer-web, driver-web chưa từng được ghi vào tài liệu.
- Tạo bộ tài liệu chuẩn hóa tại `claude/docs/` (file này và các file 00–05 + `tickets/`), giữ nguyên các file `claude/*.md` cũ làm tài liệu tham khảo lịch sử, không sửa/xóa.
- Xem [03_PROGRESS.md](03_PROGRESS.md) cho bảng trạng thái đầy đủ, [04_BUG_TRACKER.md](04_BUG_TRACKER.md) cho các bug phát hiện được.

### 2026-07-07 — Customer đặt chuyến + gọi tài xế qua voicebot; admin panel có login + trang customers
- Commit `57e957c`.
- Thêm luồng đặt chuyến từ phía khách hàng qua customer-web, gọi tài xế qua voice-agent (SIP bridge).
- Admin panel: thêm màn hình login, trang quản lý customers.
- (Ghi lại hồi tố từ git log — chi tiết đầy đủ có thể không đầy đủ vì không có log gốc tại thời điểm làm.)

### 2026-07-03 (ước lượng) — Thêm auth-service (JWT)
- Commit `06e60a3` (message gốc: "Develop the Prompt3D interface and implement a user authentication mechanism (JWT)" — message có vẻ không khớp nội dung, cần xác nhận lại với người phụ trách).
- Xây `src/backend/auth-service`: access token + refresh token, role admin/driver/customer, khóa tài khoản.
- **Chưa được tích hợp vào tài liệu kiến trúc cũ** — đã bổ sung vào [00_OVERVIEW.md](00_OVERVIEW.md).

### 2026-07-01 — Chuyển call-center, call-logger, trip-service từ Python sang TypeScript/Express
- Commit `708f02c`.
- Lý do & đánh đổi: xem [05_DECISIONS.md](05_DECISIONS.md).
- Rủi ro đã phát hiện: bản viết lại làm rớt mất 2 tính năng của bản Python cũ (tóm tắt cuộc gọi bằng GPT-4o, cập nhật trạng thái trip khi khách xác nhận qua DTMF) — xem [BUG-002](tickets/BUG-002.md).

### ⋯ (trước 2026-07-01)
- Xem lịch sử chi tiết trong các file cũ: [`claude/working.md`](../working.md), [`claude/plan.md`](../plan.md), [`claude/plan_v2.md`](../plan_v2.md), các `working.md` theo từng service.

## Cách mở rộng file này

- Thêm entry mới **lên đầu** danh sách (ngay dưới phần "Quy ước ghi log"), không chèn xen giữa các entry cũ.
- Nếu log quá dài (>~30 entry), có thể cắt phần cũ sang `claude/docs/archive/02_WORK_LOG_2026H1.md` và để lại link ở đây — nhưng chưa cần làm việc này bây giờ.
