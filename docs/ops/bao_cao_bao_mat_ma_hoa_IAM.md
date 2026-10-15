# Báo cáo rà soát mã hóa truyền tải, mã hóa lưu trữ và quyền IAM

Phạm vi: AVDA-122 (gộp AVDA-32, AVDA-89, AVDA-90). Ngày rà soát: 15/10/2026.
Căn cứ: template hạ tầng `infra/*/sam.yaml`, `infra/llm-orchestrator/cfn.yaml`, mã nguồn `src/backend`, và kiểm tra chỉ đọc trên tài khoản AWS (vùng ap-southeast-1).

## 1. Kết quả theo tiêu chí

| Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|
| Mã hóa lưu trữ DynamoDB | Đạt (khóa do AWS sở hữu) | Template không khai báo `SSESpecification`; `aws dynamodb describe-table` trên `local-driver-assistant-trips`, `-accounts`, `-call-records` trả `SSEDescription = null`, tức bảng dùng mã hóa mặc định bằng khóa do AWS sở hữu. DynamoDB luôn mã hóa dữ liệu lưu trữ, không tắt được |
| Truyền tải bắt buộc HTTPS/TLS | Đạt cho API | API Gateway REST chỉ có điểm cuối HTTPS, WebSocket chỉ có WSS (API Gateway không mở cổng HTTP thường); LiveKit dùng WSS cho tín hiệu và DTLS-SRTP cho âm thanh WebRTC; các lời gọi tới Twilio, OpenAI, Goong, Google dùng HTTPS |
| Không hardcode bí mật | Đạt | Mọi tham số bí mật trong template có `NoEcho: true`; tệp `.env*` (trừ `.env.example`) nằm trong `.gitignore`; quét các tệp đang theo dõi và toàn bộ lịch sử git với mẫu khóa AWS (`AKIA…`), OpenAI (`sk-proj-…`), Twilio (`SK…`, `AC…`) không thấy khóa thật (một kết quả trùng mẫu là dữ liệu font base64) |
| IAM tối thiểu theo dịch vụ | Đạt | Mỗi hàm Lambda chỉ có `DynamoDBCrudPolicy` trên bảng của chính dịch vụ; Dịch vụ Giám sát vận hành chỉ có `logs:FilterLogEvents` trên nhóm nhật ký của dự án và `ecs:DescribeServices` trên dịch vụ tác nhân; vai trò tác vụ của tác nhân chỉ ghi được vào nhóm nhật ký của nó và không có quyền DynamoDB (CON-01) |
| Mạng của tác nhân | Đạt có ghi chú | Nhóm bảo mật không có quy tắc chiều vào; chiều ra mở mọi giao thức tới 0.0.0.0/0 (cần cho WebRTC/UDP tới LiveKit) |
| Số điện thoại trong nhật ký | Đạt sau khi sửa | Bộ định dạng nhật ký dùng chung che số (0888xxx798), kiểm tra lại 0 số đầy đủ (luận văn Bảng 6.14) |
| Vị trí và số điện thoại khách theo chuyến | Đạt sau khi sửa | `GET /api/v1/trips/:tripId/location` trước đây không kiểm tra quyền; nay chỉ tài xế, khách của chuyến hoặc dịch vụ tin cậy được đọc (AVDA-48, `npm run verify:trip-access`) |

## 2. Rủi ro còn tồn tại và đề xuất

| Mức | Rủi ro | Đề xuất |
|---|---|---|
| Cao | Webhook Twilio (`/api/v1/sms/status`, trạng thái cuộc gọi) không xác thực chữ ký `X-Twilio-Signature`; ai biết địa chỉ có thể gửi sự kiện giả vào `channel-events` | Dùng `twilio.validateRequest(authToken, signature, url, params)` với URL công khai đúng như đã cấu hình trên Twilio; thử với Twilio thật trước khi bật vì sai URL sẽ chặn mọi webhook |
| Trung bình | JWT dịch vụ ký bằng khóa đối xứng dùng chung, mang `role=admin`, `permissions=['*']`; lộ khóa ở một dịch vụ là lộ quyền toàn hệ thống | Tách khóa theo dịch vụ hoặc dùng khóa bất đối xứng; giới hạn phạm vi quyền của token dịch vụ |
| Trung bình | DynamoDB chưa bật khôi phục theo thời điểm (PITR) và chống xóa | Bật `PointInTimeRecoverySpecification` và `DeletionProtectionEnabled` cho bảng tài khoản, chuyến, nhật ký cuộc gọi ở môi trường prod |
| Thấp | CORS của Dịch vụ Chuyến đi phản hồi mọi origin (`origin: true`); rủi ro thấp vì xác thực bằng header Bearer, không dùng cookie | Giới hạn danh sách origin của trang quản trị và ứng dụng web |
| Thấp | Chưa xác nhận SIP trunk giữa LiveKit và Twilio dùng TLS/SRTP | Kiểm tra cấu hình trunk (transport TLS, media encryption) trên LiveKit và Twilio |
| Thấp | Tệp nhật ký cũ trên máy phát triển ghi trước ngày che số vẫn chứa số đầy đủ | Xóa theo chính sách lưu giữ |
| Ghi chú | Khóa mã hóa là khóa do AWS sở hữu, không kiểm soát được vòng đời khóa | Nếu cần kiểm toán khóa, chuyển sang KMS do khách hàng quản lý |
