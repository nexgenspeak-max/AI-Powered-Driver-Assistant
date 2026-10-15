# Tài liệu vận hành tổng đài thoại

Phạm vi: AVDA-111. Mô tả cách dựng lại kết nối gọi điện và xử lý sự cố thường gặp của luồng gọi tài xế, gọi khách và SMS.

## 1. Kiến trúc kết nối

```
Dịch vụ Chuyến đi và Điều phối ──(LiveKit API: tạo phòng, phân công tác nhân, CreateSIPParticipant)──> LiveKit Cloud
LiveKit Cloud ──(SIP outbound trunk)──> Twilio Elastic SIP Trunk ──(PSTN)──> điện thoại tài xế / khách
Dịch vụ Liên lạc bằng tin nhắn ──(Twilio REST)──> Twilio Messaging ──> SMS
Twilio ──(webhook HTTPS)──> Dịch vụ Liên lạc bằng tin nhắn (/api/v1/sms/status, trạng thái cuộc gọi)
```

Chế độ gọi khách: `agent` (AI nói, tài xế nghe), `bridge` (tài xế nói trực tiếp, AI im lặng chờ cụm từ kết thúc), `background` (AI gọi trong phòng riêng `custcall-…`, báo kết quả về phòng của tài xế).

## 2. Dựng lại kết nối trunk

1. Twilio: tạo Elastic SIP Trunk; Termination URI dành cho LiveKit; thêm số gọi ra (Caller ID) đã mua hoặc đã xác minh.
2. LiveKit Cloud: tạo SIP outbound trunk trỏ tới Termination URI của Twilio, khai báo số gọi ra và thông tin xác thực trunk; ghi lại mã trunk `ST_…`.
3. Dịch vụ Chuyến đi và Điều phối (`envs/.env.<môi trường>`): `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_AGENT_NAME`, `SIP_TRUNK_ID` (= `ST_…`), `TELEPHONY_DEFAULT_CHANNEL`; khi dùng tài khoản dùng thử: `CALL_FORCE_VERIFIED_TO=true` và `TWILIO_VERIFIED_TO`.
4. Dịch vụ Liên lạc bằng tin nhắn: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_SMS_FROM` (tên người gửi đã đăng ký, bắt buộc với thuê bao Việt Nam), `BASE_URL` (HTTPS công khai để Twilio gọi webhook).
5. Tác nhân hội thoại: `LIVEKIT_*` cùng giá trị; `AGENT_NAME` trùng `LIVEKIT_AGENT_NAME`.
6. Kiểm tra: `npm run verify:telephony` (Dịch vụ Chuyến đi), `npm run verify:sms` (hai dịch vụ), rồi gọi thử tới số đã xác minh từ ứng dụng tài xế ("gọi khách").

Kênh Zalo (tùy chọn): `ZALO_APP_ID`, `ZALO_ACCESS_TOKEN`, `ZALO_SIP_TRUNK_ID`, `ZALO_CONSENT_REASON_CODE`.

## 3. Thông số hành vi

| Thông số | Giá trị | Nơi đặt |
|---|---|---|
| Thời gian đổ chuông tối đa | 20 giây | `DEFAULT_RING_TIMEOUT_SECONDS`, `processors/sip_call_watch.py` |
| Gọi lại khi không nghe máy (chế độ background) | Tối đa 2 lần, cách nhau 60 giây | `processors/no_answer_retry.py` |
| Chặn tự gọi số của chính tài xế | Có | `customer_call.py` (`_self_call_blocked`) |
| Mã lỗi SMS chuyển lên tài xế | Có, kèm mã Twilio | `smsService.ts`, `callService.ts` |

## 4. Xử lý sự cố theo triệu chứng

| Triệu chứng | Kiểm tra | Cách xử lý |
|---|---|---|
| Mọi cuộc gọi ra đều thất bại ngay, tài xế nghe "Không thể gọi … lúc này" | Nhật ký Dịch vụ Chuyến đi: lỗi `CreateSIPParticipant`; `SIP_TRUNK_ID` | Sai hoặc thiếu `SIP_TRUNK_ID`; trunk bị xóa; thông tin xác thực trunk sai. Kiểm tra trunk trên LiveKit và Twilio |
| Gọi được nhưng không có âm thanh | Bảng điều khiển LiveKit: phiên SIP có media không | Kiểm tra codec và mã hóa media của trunk, tường lửa của Twilio |
| Hàng loạt cuộc gọi "không nghe máy" | Nhật ký tác nhân: `call_no_answer`; tỷ lệ theo giờ | Số gọi ra bị nhà mạng gắn nhãn spam hoặc chặn; với Việt Nam cần số hoặc brandname hợp lệ theo Nghị định 91; giảm tần suất gọi lại |
| Khách thấy số lạ hoặc sai tên hiển thị | Caller ID trên trunk Twilio | Cấu hình đúng số gọi ra đã đăng ký; brandname thoại cần đăng ký với nhà mạng |
| SMS lỗi 21612 | Nhật ký `sms_failed code=21612` | Không có tuyến từ số gửi tới mạng đích; với thuê bao Việt Nam cần `TWILIO_SMS_FROM` là tên người gửi đã đăng ký |
| SMS lỗi 21408 | Nhật ký `sms_failed code=21408` | Chưa bật quyền gửi tới quốc gia đích (Geo Permissions trong Twilio Console) |
| Tài xế nghe "AI vẫn đang gọi khách" mãi | Nhật ký: thiếu `call_no_answer` hoặc `isolated call auto-completed` | Kiểm tra bộ canh giờ không nghe máy và trạng thái `/api/v1/calls/latest`; phòng `custcall-…` còn treo thì xóa phòng trên LiveKit |
| Hai cuộc gọi cùng lúc bị lẫn phòng hoặc lẫn tài xế | Nhật ký theo `room=` | Mỗi cuộc gọi nền có phòng riêng; kiểm tra metadata `driver_room_name` và bộ kiểm thử `test_sip_answered_sticky.py` |
| Webhook trạng thái không về | Twilio Console, Debugger | `BASE_URL` phải là HTTPS công khai; khi chạy cục bộ không có webhook |
