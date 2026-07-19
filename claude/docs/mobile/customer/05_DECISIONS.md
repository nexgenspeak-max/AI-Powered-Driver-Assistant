# 05 — Quyết định kỹ thuật customer-app

> File này trả lời câu hỏi: **"Tại sao customer-app lại làm như vậy?"**
> Toàn bộ quyết định về hệ thống UI dùng chung (bỏ Skia, dùng `GlassMaterial`, không dùng `@callstack/liquid-glass`...) áp dụng y hệt cho cả 2 app — xem [`../driver/05_DECISIONS.md`](../driver/05_DECISIONS.md) cho bảng đầy đủ kèm lý do. File này chỉ ghi quyết định **riêng** của customer-app.

## Quyết định riêng

| Ngày | Quyết định | Lý do |
|---|---|---|
| 2026-07-19 | Thêm `expo-file-system` làm dependency trực tiếp trong `package.json` của customer-app | Khớp với cách driver-app đã làm — bắt buộc để npm dedupe về 1 bản duy nhất, tránh xung đột Gradle (xem [`../driver/tickets/BUG-M004.md`](../driver/tickets/BUG-M004.md)) |

## Cách mở rộng file này

Giống quy ước tại [`../../web/05_DECISIONS.md`](../../web/05_DECISIONS.md). Quyết định ảnh hưởng cả 2 app → ghi ở [`../driver/05_DECISIONS.md`](../driver/05_DECISIONS.md), trỏ link từ đây.
