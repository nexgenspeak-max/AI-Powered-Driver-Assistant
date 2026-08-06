# 01 — Backlog customer-app

> File này trả lời câu hỏi: **"customer-app còn những việc gì cần làm?"**
> Phần lớn backlog kỹ thuật (wake-word, LLM, dependency) dùng chung với `driver-app` — xem [`../driver/01_BACKLOG.md`](../driver/01_BACKLOG.md). File này chỉ liệt kê phần riêng.

## Đang mở

| ID | Mô tả | Ưu tiên | Trạng thái | Ticket |
|---|---|---|---|---|
| FEAT-M001 | Xác nhận wake-word chạy ổn định trên điện thoại thật (dùng chung với driver-app) | 🔴 Cao | ⬜ | xem [`../driver/tickets/BUG-M001.md`](../driver/tickets/BUG-M001.md) |
| FEAT-005 | Chốt quan hệ giữa `customer-app` và `customer-web` (mục chung, xem [`../../web/customer/01_BACKLOG.md`](../../web/customer/01_BACKLOG.md)) | 🟡 Trung bình | ⬜ | — |

## Đã hoàn thành

| ID | Mô tả | Ngày xong | Ghi chú |
|---|---|---|---|
| — | Nhận toàn bộ hệ thống liquid-glass UI + sửa layout đồng bộ với driver-app | 2026-07-19 | Xem [02_WORK_LOG.md](02_WORK_LOG.md) |
| — | Thêm `BackButton` còn thiếu ở màn `trip/[id]` (Trip Status) | 2026-07-19 | Phát hiện qua rà soát layout — màn này trước đó không có nút quay lại giống `about`/`faq` |

## Cách mở rộng file này

Giống quy ước tại [`../../web/01_BACKLOG.md`](../../web/01_BACKLOG.md).
