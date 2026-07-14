# 05 — Quyết định kỹ thuật/nghiệp vụ

> File này trả lời câu hỏi: **"Tại sao lại làm như vậy?"**
> Ghi lại các quyết định có đánh đổi (trade-off) thật sự — không ghi những việc hiển nhiên. Mỗi quyết định nên có: **ngày, quyết định, lý do**. Không xóa quyết định cũ dù sau này bị thay thế — thêm dòng mới ghi đè và trỏ ngược lại.

## Bảng quyết định

| Ngày | Quyết định | Lý do |
|---|---|---|
| 2026-05-16 | Dùng Twilio thay vì VAPI cho call-center | Đơn giản hơn, rẻ hơn |
| 2026-05-16 | call-center chạy trên AWS Lambda | Webhook stateless, tự scale về 0 khi không dùng |
| 2026-05-16 | voice-agent chạy trên ECS Fargate | Cần giữ kết nối WebRTC liên tục, không hợp với Lambda |
| 2026-05-16 | Không dùng Secrets Manager, dùng file `.env` | Tiết kiệm chi phí cho đồ án |
| 2026-05-22 | Tái cấu trúc voice-agent thành `providers/ tools/ agent/ services/` | Dễ mở rộng, tách rõ trách nhiệm |
| 2026-05-22 | Dispatch agent tường minh (explicit dispatch) thay vì auto-dispatch qua SIP | Auto-dispatch không ổn định |
| 2026-05-24 | Dùng `raw_schema` cho tool của LLM | Cho phép mô tả tiếng Việt phong phú hơn cho LLM |
| 2026-05-24 | Tách riêng `CustomerAgent` khỏi `DriverAgent` | Nghiệp vụ hỗ trợ khách khác hẳn nghiệp vụ tài xế |
| 2026-05-24 | Bật `transcription_enabled=True` (native transcription) | Bỏ được cách làm thủ công qua `publish_data` |
| 2026-05-24 | Dùng BVCTelephony để khử tiếng ồn | Chất lượng thật cho môi trường mobile |
| **2026-07-01** | **Viết lại call-center, call-logger, trip-service từ Python/FastAPI/Lambda sang TypeScript/Express** | Không có ghi chú lý do gốc trong code/commit — **cần bổ sung khi có dịp hỏi lại người quyết định**. Đánh đổi đã biết: rớt mất 2 tính năng của bản cũ, xem [BUG-002](tickets/BUG-002.md) |
| **2026-07-03** | **Thêm auth-service (JWT) độc lập, không gộp vào trip-service** | Tách riêng để dùng chung cho admin/driver/customer, tránh mỗi service tự quản lý auth |
| **2026-07-07** | **Thêm customer-web và driver-web (web app) song song với mobile-app Expo đã có** | Chưa rõ lý do — có thể là mở rộng kênh tiếp cận (web không cần cài app). Đã chốt ngày 2026-07-14, xem dòng dưới |
| **2026-07-14** | **Giữ song song web (customer-web/driver-web) và mobile app (Expo)**; mobile app chính thức là `src/frontend/customer-app` + `src/frontend/driver-app` (Expo Router + NativeWind, Zustand, React Query) | Web dùng cho tiếp cận nhanh không cần cài đặt, mobile app dùng khi cần trải nghiệm native đầy đủ (voicebot, thông báo...). `src/frontend/mobile-app/customer-app` và `mobile-app/driver-app` (React Native bare, không phát triển tiếp từ 2026-06-03) bị bỏ, không dùng nữa nhưng chưa xóa khỏi repo |

## Quyết định còn treo

Các việc sau **chưa được quyết định chính thức**, đang là khoảng trống giữa tài liệu và thực tế:

- **Lý do đổi Python → TypeScript** cho 3 service backend: chưa có ghi chú chính thức. Nên bổ sung 1 dòng vào bảng trên khi xác nhận được (ví dụ: đồng bộ ngôn ngữ với frontend, dễ tuyển dụng, performance...).

## Cách mở rộng file này

- Có quyết định mới ảnh hưởng kiến trúc/nghiệp vụ → thêm 1 dòng vào bảng, **không sửa/xóa dòng cũ** kể cả khi quyết định đó đã bị thay thế (ghi dòng mới, có thể ghi "thay thế quyết định ngày ..." trong cột Lý do).
- Quyết định chưa chốt nhưng cần biết sớm → thêm vào "Quyết định còn treo", xóa khỏi đó khi đã chốt và chuyển thành 1 dòng chính thức trong bảng trên.
