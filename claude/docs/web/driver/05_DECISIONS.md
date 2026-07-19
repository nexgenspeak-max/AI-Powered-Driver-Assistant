# 05 — Quyết định driver-web

> File này trả lời câu hỏi: **"Tại sao driver-web lại làm như vậy?"**
> Bản tách riêng từ [`../05_DECISIONS.md`](../05_DECISIONS.md), chỉ giữ quyết định liên quan `driver-web`.

## Bảng quyết định

| Ngày | Quyết định | Lý do |
|---|---|---|
| 2026-07-07 | Thêm `driver-web` song song với `driver-app` (mobile, Expo) đã có | Chưa rõ lý do gốc — có thể là mở rộng kênh tiếp cận |
| 2026-07-14 | Giữ song song `driver-web` và `driver-app`; `driver-app` là app mobile chính thức | Web dùng cho tiếp cận nhanh không cần cài đặt, mobile dùng khi cần trải nghiệm native đầy đủ (voicebot, thông báo, wake-word rảnh tay) |

## Cách mở rộng file này

Giống quy ước tại [`../05_DECISIONS.md`](../05_DECISIONS.md). Quyết định ảnh hưởng cả `driver-web` lẫn `customer-web`/backend → ghi vào file gốc.
