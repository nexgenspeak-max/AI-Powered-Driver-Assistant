# 01 — Backlog nghiệp vụ

> File này trả lời câu hỏi: **"Còn những nghiệp vụ/feature nào cần làm?"**
> Đây là danh sách sống — khi một mục được nhận làm, tạo ticket trong [`tickets/`](tickets/) và nối cột "Ticket". Khi xong, chuyển trạng thái sang ✅ và chuyển xuống mục "Đã hoàn thành" ở cuối file (không xóa, để giữ lịch sử).

## Quy ước

- **ID**: `FEAT-XXX` cho tính năng mới, đánh số tăng dần, không tái sử dụng số đã dùng.
- **Ưu tiên**: 🔴 Cao / 🟡 Trung bình / 🟢 Thấp.
- **Trạng thái**: ⬜ Chưa làm / 🔨 Đang làm / ✅ Xong / ⏸️ Tạm hoãn.
- Mỗi dòng backlog **nên** có ticket chi tiết trong `tickets/FEAT-XXX.md` trước khi bắt đầu code nếu việc đủ lớn (>1 file, >nửa ngày công). Việc nhỏ có thể làm thẳng không cần ticket.

## Đang mở

| ID | Mô tả | Service | Ưu tiên | Trạng thái | Ticket |
|---|---|---|---|---|---|
| FEAT-001 | Ghép tài xế gần nhất thay vì hardcode 1 số điện thoại cố định khi có booking chưa gán tài xế | trip-service | 🔴 Cao | ⬜ | [FEAT-001](tickets/FEAT-001.md) |
| FEAT-002 | Nối LLM thật (Anthropic/OpenAI/Gemini) cho nút "AI assistant" trên customer-web/driver-web, hiện là placeholder | customer-web, driver-web | 🟡 Trung bình | ⬜ | [FEAT-002](tickets/FEAT-002.md) |
| FEAT-003 | Tóm tắt cuộc gọi bằng GPT-4o trong call-center (bản TS mới thiếu so với bản Python cũ) | call-center | 🔴 Cao | ⬜ | xem [BUG-002](tickets/BUG-002.md) (được xử lý chung với ticket bug vì là regression) |
| FEAT-004 | Cập nhật trạng thái trip (confirmed/rejected) khi khách bấm DTMF 1/2 trong call-center | call-center, trip-service | 🔴 Cao | ⬜ | xem [BUG-002](tickets/BUG-002.md) |
| FEAT-005 | Chốt quan hệ giữa mobile-app (Expo) và web app (customer-web/driver-web): giữ song song hay ngưng 1 bên | frontend (toàn bộ) | 🟡 Trung bình | ⬜ | — (cần quyết định trước, xem [05_DECISIONS.md](05_DECISIONS.md#quyết-định-còn-treo)) |
| FEAT-006 | Deploy call-logger (đã build xong nhưng chưa deploy) | call-logger | 🟢 Thấp | ⬜ | — |
| FEAT-007 | Nhắc lịch/reminder trước giờ đón khách (kế hoạch cũ trong plan.md chưa từng làm) | trip-service, voice-agent | 🟢 Thấp | ⬜ | — |
| FEAT-008 | Lớp test toàn diện (unit + integration) cho các service TS mới viết lại | tất cả backend TS | 🟡 Trung bình | ⬜ | — |

## Đã hoàn thành

| ID | Mô tả | Ngày xong | Ghi chú |
|---|---|---|---|
| — | Viết lại call-center, call-logger, trip-service từ Python sang TypeScript/Express | 2026-07-01 | Xem [05_DECISIONS.md](05_DECISIONS.md) |
| — | Thêm auth-service (JWT, role admin/driver/customer) | 2026-07-03 | |
| — | Customer đặt chuyến + gọi tài xế qua voicebot; admin panel có login + trang customers | 2026-07-07 | |

## Cách mở rộng file này

- Thêm nghiệp vụ mới → thêm dòng vào bảng "Đang mở" với ID tiếp theo.
- Khi bắt đầu làm → đổi trạng thái sang 🔨, tạo ticket nếu cần.
- Khi xong → đổi ✅, cắt dòng xuống bảng "Đã hoàn thành" kèm ngày xong.
- Đừng xóa mục đã hoàn thành — đây là lịch sử tra cứu, không phải to-do list tạm thời.
