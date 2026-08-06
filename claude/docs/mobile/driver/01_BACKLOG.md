# 01 — Backlog driver-app

> File này trả lời câu hỏi: **"driver-app còn những việc gì cần làm?"**
> Quy ước ID/ưu tiên/trạng thái giống [`../../web/01_BACKLOG.md`](../../web/01_BACKLOG.md).

## Đang mở

| ID | Mô tả | Ưu tiên | Trạng thái | Ticket |
|---|---|---|---|---|
| FEAT-M001 | Xác nhận wake-word ("trợ lý rảnh tay") chạy ổn định trên **điện thoại thật** — mọi test đến nay đều trên emulator, nơi có giới hạn đã biết của Android (xem [BUG-M001](tickets/BUG-M001.md)) | 🔴 Cao | ⬜ | [BUG-M001](tickets/BUG-M001.md) |
| FEAT-M002 | Nối LLM thật cho khung chat text trong `AssistantChatPanel` (hiện gọi `getAssistantReply`, cần xác nhận đã nối thật hay còn stub) | 🟡 Trung bình | ⬜ | — |
| FEAT-005 | Chốt quan hệ giữa `driver-app` và `driver-web` (mục chung, xem [`../../web/driver/01_BACKLOG.md`](../../web/driver/01_BACKLOG.md)) | 🟡 Trung bình | ⬜ | — |
| FEAT-M004 | Tự động gọi khách hàng khi tài xế GPS còn ~1km tới điểm đón (background location tracking + proximity call) | 🟡 Trung bình | 🔨 Code xong (FE+BE+voice-agent), BE/voice-agent test thật rồi, FE chờ test thiết bị thật | [FEAT-M004](tickets/FEAT-M004.md) |
| FEAT-M005 | ~~Tự động tìm & gán tài xế theo vị trí~~ → **đã gỡ bỏ**, thay bằng khách tự chọn tài xế online từ danh sách (`DriverPicker` + `GET /drivers/online`), gửi thẳng qua `POST /trips` (flow gán trực tiếp cũ, không đổi). WebSocket real-time giữ lại, dùng thêm cho thông báo nhận/từ chối chuyến về khách | 🟡 Trung bình | 🔨 Code xong (BE+2 FE), test local qua tsc + grep sạch; **chưa test thiết bị thật** (khách chọn tài xế → tài xế nhận/từ chối trên app thật) | [FEAT-M005](tickets/FEAT-M005.md) |

## Đã hoàn thành

| ID | Mô tả | Ngày xong | Ghi chú |
|---|---|---|---|
| — | Xây hệ thống liquid-glass UI (GlassMaterial/GlassSheen/useGlassPress/GlowOverlay), áp dụng cho Card/Badge/Button/BackButton/TabBar | 2026-07-19 | Xem [02_WORK_LOG.md](02_WORK_LOG.md) |
| — | Rà soát và sửa layout toàn bộ màn hình (safe-area, spacing, màu semantic) | 2026-07-19 | |
| — | Điều tra và xác nhận nguyên nhân wake-word không nghe được trên emulator | 2026-07-19 | Xem [BUG-M001](tickets/BUG-M001.md) |
| — | Sửa xung đột dependency `expo-file-system` khiến build Android thất bại | 2026-07-19 | Xem [BUG-M004](tickets/BUG-M004.md) |
| — | Tách `LiquidGlass.tsx` (265 dòng) thành module con + tách `GlassTabButton` ra khỏi route file | 2026-07-19 | |

## Cách mở rộng file này

Giống quy ước tại [`../../web/01_BACKLOG.md`](../../web/01_BACKLOG.md). Việc ảnh hưởng cả 2 app mobile → cân nhắc ghi ở cả `docs/mobile/customer/01_BACKLOG.md` và file này (2 app dùng chung phần lớn code UI).
