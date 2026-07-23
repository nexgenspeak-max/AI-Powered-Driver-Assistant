# 05 — Quyết định customer-web

> File này trả lời câu hỏi: **"Tại sao customer-web lại làm như vậy?"**
> Bản tách riêng từ [`../05_DECISIONS.md`](../05_DECISIONS.md), chỉ giữ quyết định liên quan `customer-web`.

## Bảng quyết định

| Ngày | Quyết định | Lý do |
|---|---|---|
| 2026-07-07 | Thêm `customer-web` song song với `customer-app` (mobile, Expo) đã có | Chưa rõ lý do gốc — có thể là mở rộng kênh tiếp cận (web không cần cài app) |
| 2026-07-14 | Giữ song song `customer-web` và `customer-app`; `customer-app` là app mobile chính thức | Web dùng cho tiếp cận nhanh không cần cài đặt, mobile dùng khi cần trải nghiệm native đầy đủ (voicebot, thông báo...) |

## Cách mở rộng file này

Giống quy ước tại [`../05_DECISIONS.md`](../05_DECISIONS.md). Quyết định ảnh hưởng cả `customer-web` lẫn `driver-web`/backend → ghi vào file gốc.
