# FEAT-009 — Tài xế nhờ AI gọi tới bất kỳ số điện thoại nào

| | |
|---|---|
| **Loại** | Feature |
| **Service** | voice-agent, trip-service |
| **Ưu tiên** | 🟢 Thấp |
| **Trạng thái** | ⬜ Chưa làm |
| **Liên quan** | [01_BACKLOG.md](../01_BACKLOG.md), [BUG-006](BUG-006.md) (dùng chung hạ tầng gọi SIP trong phòng) |

## Mô tả

Hiện tại `call_customer` (driver gọi) và `call_driver` (customer gọi) chỉ cho phép gọi tới đúng số điện thoại đã gắn sẵn với chuyến đang chạy (`current.get("customer_phone")` / `trip.get("driver_phone")`) — xem [tools_definition.py:89-108](../../../src/backend/voice-agent/app/voicebot/vn/tools_definition.py#L89-L108) và [call_customer.py](../../../src/backend/voice-agent/app/voicebot/vn/tools/call_customer.py).

Tính năng mới: cho tài xế nói ra 1 số điện thoại bất kỳ (không nằm trong dữ liệu chuyến) và nhờ AI gọi số đó — ví dụ tài xế cần gọi cho người thân, tổng đài, hoặc một khách hàng không thuộc chuyến hiện tại.

## Ngữ cảnh

- Hạ tầng gọi SIP trong phòng (dial vào room qua `dialCustomerViaLiveKit` trong [callService.ts](../../../src/backend/trip-service/src/services/callService.ts)) về cơ bản đã có sẵn, đang nhận `dialTo` là số đã biết trước từ dữ liệu chuyến — cần mở rộng để nhận số tự do do tài xế cung cấp qua giọng nói.
- Cần cân nhắc giới hạn/bảo mật: tài xế có thể lạm dụng để gọi đi bất kỳ đâu qua hệ thống (phát sinh chi phí Twilio ngoài ý muốn, hoặc gọi số ngoài phạm vi công việc) — nên có validate/giới hạn (ví dụ chỉ số Việt Nam hợp lệ, giới hạn số cuộc gọi tự do/ngày, hoặc yêu cầu xác nhận lại số trước khi gọi).
- Nên tái sử dụng tối đa logic dial/hand-off đã có ở `customer_call.py`/`driver_call.py` thay vì viết luồng mới song song.

## Yêu cầu / Acceptance Criteria (nháp — cần làm rõ thêm khi bắt tay vào)

- [ ] Tài xế nói "gọi giúp tôi số 09xx..." → AI xác nhận lại số trước khi gọi (tránh nghe nhầm số qua giọng nói).
- [ ] AI gọi đúng số tài xế cung cấp, không giới hạn ở `customer_phone` của chuyến.
- [ ] Có giới hạn/validate chống lạm dụng (số hợp lệ, giới hạn tần suất) — cần chốt cụ thể trước khi implement.
- [ ] Không phá vỡ luồng `call_customer`/`call_driver` hiện có (đây là tool/luồng bổ sung, không thay thế).

## Việc cần làm

1. Chốt yêu cầu bảo mật/giới hạn với người phụ trách nghiệp vụ trước khi implement (mục "Ngữ cảnh" ở trên).
2. Thiết kế tool mới (ví dụ `call_custom_number`) hoặc mở rộng `call_customer` với tham số số điện thoại tùy chọn.
3. Xác nhận lại số qua giọng nói trước khi gọi (tránh gọi nhầm do STT nghe sai số).
4. Tái sử dụng hạ tầng dial/hand-off đã có trong `customer_call.py`/`callService.ts`.
5. Cập nhật [01_BACKLOG.md](../01_BACKLOG.md) → ✅ khi xong, ghi log vào [02_WORK_LOG.md](../02_WORK_LOG.md).

## Ghi chú

Mới chỉ ghi nhận yêu cầu — chưa điều tra kỹ thuật chi tiết, chưa ước lượng công sức. Cập nhật ticket khi bắt tay vào làm thật.
