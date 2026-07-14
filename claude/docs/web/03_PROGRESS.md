# 03 — Tiến độ tổng hợp

> File này trả lời câu hỏi: **"Đã làm đến đâu?"**
> Là ảnh chụp trạng thái *hiện tại* (khác với [`02_WORK_LOG.md`](02_WORK_LOG.md) là lịch sử theo thời gian). Cập nhật bảng này mỗi khi một service/feature đổi trạng thái — không cần đợi review định kỳ.

## Quy ước trạng thái

✅ Hoàn thành &nbsp;·&nbsp; 🔨 Đang làm &nbsp;·&nbsp; ⬜ Chưa bắt đầu &nbsp;·&nbsp; ⚠️ Hoàn thành nhưng có vấn đề/thiếu sót đã biết

## Backend

| Service | Trạng thái | Ghi chú |
|---|---|---|
| auth-service | ✅ | JWT access+refresh, role admin/driver/customer. Chưa có tài liệu API riêng. |
| trip-service | ⚠️ | CRUD + dispatch LiveKit hoạt động; phân quyền JWT theo chủ sở hữu trip đang được thêm (uncommitted). Thiếu logic ghép tài xế gần nhất — xem [FEAT-001](tickets/FEAT-001.md). |
| call-center | ⚠️ | Webhook Twilio hoạt động; **regression** so với bản Python cũ — thiếu tóm tắt cuộc gọi bằng GPT-4o và cập nhật trạng thái trip qua DTMF — xem [BUG-002](tickets/BUG-002.md). |
| call-logger | ✅ (chưa deploy) | Đã build xong, chưa deploy lên môi trường thật — xem [FEAT-006 trong backlog](01_BACKLOG.md). |
| voice-agent | ⚠️ | DriverAgent + CustomerAgent, SIP bridge 2 chiều (driver gọi khách / khách gọi driver), silence tracker, noise cancel. SIP bridge đang có nhiều lỗi đã ghi nhận (một số đã sửa, một số chưa) — xem bảng tóm tắt ở đầu [BUG-006](tickets/BUG-006.md) trước khi coi tính năng gọi điện là ổn định. |

## Frontend

| App | Trạng thái | Ghi chú |
|---|---|---|
| admin-panel | ✅ | Trip board, quản lý tài xế, login, trang customers, call logs (đang refactor thành feature module, uncommitted). |
| customer-web | 🔨 | Đặt chuyến + gọi tài xế qua voicebot hoạt động. Nút "AI assistant" là placeholder chưa nối LLM — [FEAT-002](tickets/FEAT-002.md). |
| driver-web | 🔨 | Tương tự customer-web, mới thêm 2026-07-07. |
| mobile-app/customer-app (Expo) | ✅ | Đã build, có màn hình support qua LiveKit. Quan hệ với `customer-web` chưa chốt. |
| mobile-app/driver-app (Expo) | ✅ | Đã build, có DigitalHumanScreen (voice qua LiveKit). Quan hệ với `driver-web` chưa chốt. |

## Việc đang dở dang (uncommitted tại thời điểm viết file)

| Việc | Vị trí | Mô tả |
|---|---|---|
| Chuẩn hóa casing trạng thái trip | trip-service, admin-panel | uppercase → lowercase, xem [BUG-001](tickets/BUG-001.md) |
| Phân quyền JWT theo chủ sở hữu trip | trip-service/routes/trips.ts | driver/customer chỉ sửa được trip của mình |
| Refactor CallLogsPage | admin-panel | Tách thành feature module (`features/call-logs/`) |
| Fix thẻ thống kê trip đếm sai | admin-panel/TripBoardPage.tsx | Trước đó đếm theo danh sách đã lọc thay vì tổng thật |

## Cách mở rộng file này

- Khi 1 service đổi trạng thái → sửa trực tiếp dòng tương ứng trong bảng, không thêm dòng mới.
- Thêm service/app mới → thêm dòng mới vào bảng phù hợp (Backend/Frontend), đồng thời thêm vào [00_OVERVIEW.md](00_OVERVIEW.md).
- Việc "đang dở dang" đã commit xong → xóa khỏi bảng "Việc đang dở dang", ghi lại vào [02_WORK_LOG.md](02_WORK_LOG.md).
