# FEAT-009 — Tài xế nhờ AI gọi tới bất kỳ số điện thoại nào

| | |
|---|---|
| **Loại** | Feature |
| **Service** | voice-agent, trip-service |
| **Ưu tiên** | 🟢 Thấp |
| **Trạng thái** | 🟡 Đang làm (đã code phần voice-agent, chưa kiểm thử thực tế / thu thập rate-limit) |
| **Liên quan** | [01_BACKLOG.md](../01_BACKLOG.md), [BUG-006](BUG-006.md) (dùng chung hạ tầng gọi SIP trong phòng) |

## Mô tả

Hiện tại `call_customer` (driver gọi) và `call_driver` (customer gọi) chỉ cho phép gọi tới đúng số điện thoại đã gắn sẵn với chuyến đang chạy (`current.get("customer_phone")` / `trip.get("driver_phone")`) — xem [tools_definition.py:89-108](../../../src/backend/voice-agent/app/voicebot/vn/tools_definition.py#L89-L108) và [call_customer.py](../../../src/backend/voice-agent/app/voicebot/vn/tools/call_customer.py).

Tính năng mới: cho tài xế nói ra 1 số điện thoại bất kỳ (không nằm trong dữ liệu chuyến) và nhờ AI gọi số đó — ví dụ tài xế cần gọi cho người thân, tổng đài, hoặc một khách hàng không thuộc chuyến hiện tại.

## Ngữ cảnh

- Hạ tầng gọi SIP trong phòng (dial vào room qua `dialCustomerViaLiveKit` trong [callService.ts](../../../src/backend/trip-service/src/services/callService.ts)) về cơ bản đã có sẵn, đang nhận `dialTo` là số đã biết trước từ dữ liệu chuyến — cần mở rộng để nhận số tự do do tài xế cung cấp qua giọng nói.
- Cần cân nhắc giới hạn/bảo mật: tài xế có thể lạm dụng để gọi đi bất kỳ đâu qua hệ thống (phát sinh chi phí Twilio ngoài ý muốn, hoặc gọi số ngoài phạm vi công việc) — nên có validate/giới hạn (ví dụ chỉ số Việt Nam hợp lệ, giới hạn số cuộc gọi tự do/ngày, hoặc yêu cầu xác nhận lại số trước khi gọi).
- Nên tái sử dụng tối đa logic dial/hand-off đã có ở `customer_call.py`/`driver_call.py` thay vì viết luồng mới song song.

## Yêu cầu / Acceptance Criteria

- [x] Tài xế nói "gọi giúp tôi số 09xx..." → AI xác nhận lại số trước khi gọi (tránh nghe nhầm số qua giọng nói).
- [x] AI gọi đúng số tài xế cung cấp, không giới hạn ở `customer_phone` của chuyến.
- [x] Có giới hạn/validate chống lạm dụng (số VN hợp lệ + tối đa `MAX_CUSTOM_CALLS_PER_SESSION` = 3 cuộc/phiên) — mức mặc định kỹ thuật, có thể chỉnh lại khi nghiệp vụ chốt số cụ thể.
- [x] Không phá vỡ luồng `call_customer`/`call_driver` hiện có (tool/luồng bổ sung, độc lập).

## Việc cần làm

1. ~~Chốt yêu cầu bảo mật/giới hạn với người phụ trách nghiệp vụ trước khi implement~~ — đã tạm áp giới hạn kỹ thuật mặc định (xem "Ghi chú" bên dưới), cần nghiệp vụ xác nhận lại nếu muốn số khác.
2. [x] Thiết kế tool mới `call_custom_number` (bước 1: đọc lại số để xác nhận) + `confirm_call_custom_number` (bước 2: thực hiện gọi) — theo đúng pattern 2 bước đã dùng cho `request_cancel_trip`/`confirm_cancel_trip`.
3. [x] Xác nhận lại số qua giọng nói trước khi gọi.
4. [x] Tái sử dụng hạ tầng dial/hand-off đã có (`backend_api.start_call` → `callService.ts` không cần sửa gì — route `/calls/start` đã hỗ trợ số tự do khi không truyền `tripId`).
5. [ ] Test thực tế qua LiveKit + SIP trunk thật (chưa chạy được trong môi trường này do thiếu `livekit` package/credentials).
6. [ ] Cập nhật [01_BACKLOG.md](../01_BACKLOG.md) → ✅ khi xong, ghi log vào [02_WORK_LOG.md](../02_WORK_LOG.md).

## Ghi chú

### Đã implement (chỉ luồng tài xế, tiếng Việt)

- `app/voicebot/processors/custom_call.py` (mới): validate/normalize số điện thoại VN (di động, cố định, đầu số 1900/1800), format đọc lại, và `start_bridge_call_to_number()` — dial số tự do vào phòng LiveKit của tài xế rồi hand-off sang `BridgeCallAgent` (tài xế nói chuyện trực tiếp), tái dùng gần như nguyên logic của `customer_call.start_in_room_bridge_call`.
- `app/voicebot/vn/tools/call_custom_number.py` + `confirm_call_custom_number.py` (mới): tool 2 bước — bước 1 validate số + trả câu hỏi xác nhận lại số cho AI đọc; bước 2 mới thực sự dial, sau khi tài xế xác nhận bằng lời.
- `tools_definition.py`, `tools_mapping.py`, `agent.py` (vn/): đăng ký schema + hướng dẫn từ khóa + gắn tool vào `_DRIVER_INBOUND_TOOLS`.
- `constants.py` (vn/): 3 thông báo lỗi mới (số không hợp lệ / vượt giới hạn phiên / không có số đang chờ xác nhận).
- Không cần sửa `callService.ts`/`calls.ts` (trip-service) — route `/calls/start` chỉ override `phoneNumber` bằng `trip.customer_phone` KHI có `tripId`; tool mới gọi với `tripId=""` nên số tự do được dùng nguyên vẹn.
- Chỉ hỗ trợ mode `bridge` (tài xế tự nói chuyện) cho số tự do — không hỗ trợ mode `agent`/`background` vì AI không có ngữ cảnh gì để nói chuyện thay tài xế với một số lạ.

### Mở rộng sau này: gọi theo danh bạ

`start_bridge_call_to_number(context, phone_number, contact_name=...)` đã tách khỏi tool hiện tại — một tool `call_contact` sau này chỉ cần resolve tên liên hệ → `phone_number` (từ danh bạ lưu ở backend) rồi gọi thẳng hàm này, không cần đụng vào logic dial/hand-off. `call_custom_number` cũng đã có sẵn tham số `contact_name` tùy chọn để tài xế có thể nói "gọi cho vợ tôi, số là..." ngay từ bây giờ dù chưa có tra cứu danh bạ thật.

### Giới hạn đã biết / cần theo dõi

- Giới hạn 3 cuộc/phiên là số mặc định kỹ thuật (`MAX_CUSTOM_CALLS_PER_SESSION` trong `custom_call.py`), reset mỗi phiên gọi mới — chưa có giới hạn theo ngày/theo tài xế ở tầng backend. Nếu cần chặn lạm dụng chặt hơn (vd. theo ngày, theo chi phí Twilio), nên thêm ở trip-service (Redis counter theo `driverPhone`) chứ không chỉ ở voice-agent.
- Validate số điện thoại chỉ chấp nhận định dạng Việt Nam (di động, cố định, đầu số 1900/1800) — không gọi được số quốc tế.
- Chưa test end-to-end qua SIP trunk thật; mới kiểm tra logic validate/normalize số bằng script độc lập và biên dịch cú pháp Python.
