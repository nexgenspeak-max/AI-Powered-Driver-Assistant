# 01 — Backlog driver-app

> File này trả lời câu hỏi: **"driver-app còn những việc gì cần làm?"**
> Quy ước ID/ưu tiên/trạng thái giống [`../../web/01_BACKLOG.md`](../../web/01_BACKLOG.md).

## Đang mở

| ID | Mô tả | Ưu tiên | Trạng thái | Ticket |
|---|---|---|---|---|
| FEAT-M001 | Xác nhận wake-word ("trợ lý rảnh tay") chạy ổn định trên **điện thoại thật** — mọi test đến nay đều trên emulator, nơi có giới hạn đã biết của Android (xem [BUG-M001](tickets/BUG-M001.md)) | 🔴 Cao | ⬜ | [BUG-M001](tickets/BUG-M001.md) |
| FEAT-M002 | Nối LLM thật cho khung chat text trong `AssistantChatPanel` (hiện gọi `getAssistantReply`, cần xác nhận đã nối thật hay còn stub) | 🟡 Trung bình | ⬜ | — |
| FEAT-M003 | Xác thực giọng nói "chủ nhân" cho wake-word (voiceprint) — chỉ đúng giọng chủ tài khoản mới dùng được trợ lý AI | 🟡 Trung bình | 🔨 Đã code, chưa test thiết bị thật | [FEAT-M003](tickets/FEAT-M003.md) |
| FEAT-005 | Chốt quan hệ giữa `driver-app` và `driver-web` (mục chung, xem [`../../web/driver/01_BACKLOG.md`](../../web/driver/01_BACKLOG.md)) | 🟡 Trung bình | ⬜ | — |

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
