# Chương 5. Triển khai

Chương này mô tả cách hiện thực nguyên mẫu theo thiết kế Chương 4. Mục 5.1–5.2 nêu công nghệ và cách tổ chức mã nguồn. Mục 5.3–5.5 lần lượt trình bày voice-agent, các dịch vụ backend và ứng dụng tài xế. Mục 5.6 đi sâu vài thành phần tiêu biểu (gọi khách, FAQ, quét đơn, từ khóa đánh thức). Mục 5.7 ghi chú cấu hình triển khai (không chứa bí mật). Mục 5.8 ánh xạ quyết định thiết kế sang vị trí mã nguồn để đối chiếu với Chương 6.

## 5.1. Công nghệ sử dụng

Nguyên mẫu chạy trên một kho mã nguồn dùng chung, chọn bộ công nghệ theo vai trò từng lớp:

**Bảng 5.1.** Công nghệ chính theo lớp

| Lớp | Công nghệ | Vai trò trong nguyên mẫu |
|---|---|---|
| Ứng dụng tài xế | React Native (Expo), TypeScript, Tamagui | Giao diện, mic/loa WebRTC, từ khóa đánh thức, cài đặt |
| Hội thoại AI | Python, LiveKit Agents | Worker vào phòng, STT–LLM–TTS, công cụ |
| Backend nghiệp vụ | Node.js / TypeScript, Express | trip-service, auth-service, call-center, call-logger, ops |
| Truyền thông thời gian thực | LiveKit Cloud (WebRTC + SIP) | Phòng thoại trong ứng dụng và nhánh điện thoại |
| Dữ liệu phiên / bộ nhớ đệm | Redis (khi bật) | Tái sử dụng phòng, nhắc việc đang chờ… |
| Tri thức FAQ | LlamaIndex + playbook Markdown | Công cụ trả lời cách dùng ứng dụng |
| Quét đơn | Dịch vụ vision (HTTP) + API trip-service | Trích thông tin từ ảnh đơn |

Nhà cung cấp STT/LLM/TTS được gắn qua lớp cấu hình/plugin của LiveKit Agents, đúng nguyên tắc “đổi nhà cung cấp không đổi kiến trúc” ở Chương 4. Chi tiết tên mô hình/cấu hình môi trường để Phụ lục D (không đưa bí mật vào luận văn).

## 5.2. Tổ chức mã nguồn (kho mã dùng chung)

Cấu trúc thư mục chính (rút gọn):

```
src/backend/
  voice-agent/      # worker Python LiveKit
  trip-service/     # API chuyến, token thoại, gọi/SMS, ngữ cảnh
  auth-service/     # đăng nhập JWT, cài đặt tài xế
  call-center/      # điều phối quay số
  call-logger/      # lưu vết / bản ghi lời thoại
  ops-service/      # lớp giám sát phía vận hành
src/frontend/
  driver-app/       # ứng dụng tài xế (trọng tâm)
  customer-app/     # ứng dụng khách (phụ)
  admin-panel/ …    # tạo dữ liệu thử, vận hành
```

**Quy ước triển khai quan trọng:**

- Voice-agent **chỉ** gọi trip-service (và dịch vụ liên quan) bằng HTTP — không mở kết nối cơ sở dữ liệu từ Python.
- Gói ngôn ngữ trợ lý nằm ở `voicebot/locales/vn` và `voicebot/locales/en` (hành vi công cụ đối xứng nhau).
- Tài liệu yêu cầu nội bộ (kịch bản hội thoại, playbook FAQ) nằm cạnh voice-agent để đồng bộ với lời nhắc hệ thống và công cụ.

## 5.3. Hiện thực voice-agent

### 5.3.1. Vào phiên và phân loại phòng

Điểm vào worker (`app/agent/session.py`) đọc **tên phòng** và metadata để chọn chế độ:

| Dấu hiệu phòng / metadata | Chế độ agent | Tập việc mở |
|---|---|---|
| `driver-…` không SIP | Tài xế trong ứng dụng | Đủ nhóm công cụ hỗ trợ |
| `driver-…` + `sip_identity` | Đề nghị chuyến qua điện thoại | Chủ yếu nhận / từ chối |
| `custcall-…` | Gọi khách nền | Agent cô lập nói với khách |
| Metadata khách / custcall khác | Agent khách hoặc nói trực tiếp | Theo thiết kế Ch.4 |

Khi tài xế mở trợ lý trong ứng dụng: ứng dụng gọi `POST /api/v1/voice/token` trên trip-service → nhận token và `room_name` → tham gia LiveKit → worker nhận việc.

### 5.3.2. Chào hai pha và nạp ngữ cảnh trước

Với phiên trong ứng dụng, hiện thực cố ý **không** chờ tải xong toàn bộ ngữ cảnh mới chịu chào:

1. Phát câu chào ngắn cố định (Czen).
2. Gọi `GET /api/v1/drivers/me/context`, đổ vào bộ nhớ phiên (`context_store`).
3. Hỏi tài xế cần gì.

Worker còn **làm nóng trước** (nạp gói ngôn ngữ, nhận diện giọng nói…) lúc tiến trình khởi động để lần kết nối sau đỡ “lạnh”.

### 5.3.3. Ba đường xử lý một câu nói

Sau STT chốt câu:

1. **Đường tắt** (khớp ý định nói — `spoken_intent`): khớp mẫu tiếng Việt/Anh quen thuộc → gọi thẳng xử lý công cụ → TTS → dừng lượt (`StopResponse`), không để LLM viết lại thêm vòng.
2. **Đường đủ:** câu mơ hồ / nghiệp vụ phức tạp → LLM + schema công cụ → HTTP nếu cần → TTS.
3. **Trò chuyện nhẹ:** không dính công cụ → trả lời ngắn, không nạp cả bảng công cụ.

Cơ chế **việc đang chờ** (`pending_action`): khi bot vừa hứa làm việc mà chưa gọi công cụ, câu xác nhận của tài xế (“ok”, “gọi đi”) sẽ kích hoạt công cụ thay vì chỉ đáp xã giao.

### 5.3.4. Gọi HTTP nghiệp vụ

Mọi thao tác đọc/ghi chuyến, gọi điện, thu nhập… đi qua lớp `backend_api` (HTTP client có nhật ký thời gian/lỗi). Công cụ đọc ưu tiên dữ liệu đã nạp trước; lỗi API được chuyển thành câu nói ngắn (không bịa “đã hủy” khi backend thất bại).

### 5.3.5. Im lặng và kết thúc phiên

Theo dõi im lặng phía tài xế: khoảng **15 giây** × tối đa **hai** lần nhắc, rồi chào kết thúc. Kết thúc chủ động dùng công cụ `end_conversation` / API `POST /voice/end-session` tùy ngữ cảnh.

## 5.4. Hiện thực các dịch vụ backend (nền tảng tích hợp)

### 5.4.1. trip-service

Đây là “sổ sách” chuyến đi và cửa cấp token thoại. Các nhóm đường dẫn liên quan trực tiếp trợ lý:

**Bảng 5.2.** Nhóm API trip-service phục vụ hội thoại (rút gọn)

| Nhóm | Ví dụ đường dẫn | Dùng cho |
|---|---|---|
| Thoại | `POST /api/v1/voice/token`, `…/end-session` | Ứng dụng vào phòng; đóng phiên |
| Ngữ cảnh | `GET /api/v1/drivers/me/context` | Nạp trước lịch, chuyến, cài đặt |
| Chuyến | upcoming / current / PATCH trạng thái | Xem lịch, cập nhật, hủy… |
| Gọi điện | `POST /api/v1/calls/start`, summary/latest… | Gọi khách / trạng thái cuộc gọi |
| Thu nhập / online | earnings, `…/status` | FR thu nhập & sẵn sàng |
| Đơn giao hàng | `POST …/delivery-orders/scan`, tạo đơn | Quét ảnh (không qua STT) |

Điều phối đề nghị chuyến (`dispatchService`): tạo phòng, gắn metadata chuyến + `sip_identity` khi gọi SIP, phân công voice-agent, quay số tài xế. Nếu tài xế đang mở phiên trong ứng dụng, có thể đẩy thông báo vào phòng hiện có thay vì luôn gọi mới.

### 5.4.2. auth-service và cấu hình gọi khách

Đăng nhập tài xế bằng số điện thoại + mật khẩu (vai trò `driver`). Trường cấu hình **`default_customer_call_mode`** (`agent` | `bridge`) được lưu cài đặt và đưa vào nội dung ngữ cảnh — voice-agent đọc để khỏi hỏi lại chế độ mỗi lần gọi khách.

### 5.4.3. call-center, call-logger, ops

- **call-center:** phối hợp quay số / webhook nhà cung cấp thoại.
- **call-logger:** lưu lượt thoại phục vụ tóm tắt và đối soát khi đánh giá.
- **ops-service + super-admin:** giám sát, không nằm trên đường nóng hội thoại tài xế.

## 5.5. Hiện thực ứng dụng tài xế

Ứng dụng (`driver-app`) hiện thực các điểm chạm thiết kế ở mục 4.7:

1. **Đăng nhập** → lưu token JWT; các gọi trip/auth dùng địa chỉ cơ sở cấu hình theo môi trường.
2. **Mở trợ lý:** lấy voice token → kết nối LiveKit → biểu tượng trợ lý phản ánh trạng thái (chờ / nghe / nói).
3. **Chat đồng bộ:** hiển thị bản ghi lời thoại STT/TTS để đối chiếu khi dừng xe.
4. **Cài đặt trợ lý:** chọn chế độ gọi khách mặc định (`assistant-settings`).
5. **Từ khóa đánh thức:** thành phần trên thiết bị (Vosk); khớp từ khóa → gọi cùng luồng `connect` như bấm mic — **không** gửi âm thanh đánh thức vào LLM.
6. **Quét đơn:** màn giao hàng gọi API quét ảnh; tài xế xem lại rồi mới lưu đơn.

Chi tiết giao diện và ảnh màn hình để Phụ lục C (khi có ảnh chụp).

## 5.6. Thành phần tiêu biểu

### 5.6.1. Gọi khách (ba chế độ)

Hiện thực bám Bảng 4.4b:

- **Agent:** bàn giao agent nói với khách trong phòng tài xế.
- **Nói trực tiếp:** cầu nối mic; kết thúc bằng cụm từ kích hoạt.
- **Gọi nền:** phòng `custcall-…` riêng; tóm tắt đẩy về phòng tài xế khi xong.

Số tùy ý: kiểm tra hợp lệ → lưu chờ → xác nhận mới quay số. Giới hạn số lần gọi tùy chỉnh mỗi phiên để giảm lạm dụng.

### 5.6.2. FAQ / truy xuất tăng cường sinh câu trả lời (RAG)

Công cụ `answer_app_faq` truy xuất playbook trong `requirements/knowledge/{vi,en}/` qua chuỗi xử lý RAG. Câu ngoài phạm vi đi theo chiến lược từ chối đã nêu ở Chương 3 — tránh bịa chính sách thanh toán/pháp lý.

### 5.6.3. Quét đơn giao hàng

Luồng tách khỏi lượt thoại LiveKit:

`ứng dụng` → `POST /api/v1/delivery-orders/scan` → dịch vụ vision (`/vision/delivery-scan`) → trả trường trích xuất → giao diện xác nhận → `POST` tạo đơn.

### 5.6.4. Hủy chuyến hai bước

`request_cancel_trip` lưu việc chờ trong phiên + hỏi chắc → `confirm_cancel_trip` mới gọi API hủy. Không cho hủy chỉ vì một câu mơ hồ.

## 5.7. Cấu hình và triển khai nguyên mẫu

Môi trường phát triển / thử nghiệm điển hình:

- Chạy các dịch vụ backend cục bộ (auth, trip, call-logger, …) và worker voice-agent trỏ LiveKit Cloud.
- Ứng dụng trỏ địa chỉ mạng nội bộ / thử nghiệm qua biến `EXPO_PUBLIC_*` (không đưa bí mật vào kho mã).
- SIP / đề nghị chuyến qua điện thoại cần cấu hình trunk và quy tắc phân công trên LiveKit (chi tiết tham số để Phụ lục D).

**Bảng 5.3.** Thành phần cần có để demo đầu cuối tối thiểu

| Thành phần | Bắt buộc cho | Ghi chú |
|---|---|---|
| auth-service + trip-service | Đăng nhập, token, ngữ cảnh | Nền tảng |
| voice-agent worker + LiveKit | Hội thoại trong ứng dụng | Phải thấy worker đăng ký |
| driver-app | Mic/loa thật hoặc Simulator | Kiểm giao diện + kết nối |
| call-center + SIP | Đề nghị chuyến / gọi khách mạng điện thoại công cộng | Có thể tắt nếu chỉ demo trong ứng dụng |
| call-logger | Tóm tắt cuộc gọi | Không chặn bot nói nếu tắt |

Luận văn không công bố khóa API, token LiveKit hay mật khẩu trong văn bản hay phụ lục công khai.

## 5.8. Ánh xạ thiết kế (Ch.4) → mã nguồn

**Bảng 5.4.** Đối chiếu quyết định thiết kế và hiện thực

| Quyết định Ch.4 | Hiện thực tiêu biểu |
|---|---|
| Bot không đụng cơ sở dữ liệu | `backend_api.py` HTTP → trip-service |
| Chào hai pha + nạp ngữ cảnh trước | `session.py`, lời chào trong gói ngôn ngữ agent |
| Đường tắt khớp ý định nói | `processors/spoken_intent.py` + `StopResponse` |
| Bộ nhớ ngữ cảnh | `processors/context_store.py` |
| Phân loại phòng | `_parse_room` / chế độ trong `session.py` |
| Ba chế độ gọi khách | công cụ `call_customer` + call-service / phòng `custcall` |
| Token thoại | `trip-service` `routes/voice.ts` |
| Từ khóa đánh thức | `driver-app/.../assistant-wakeword` |
| FAQ | `answer_app_faq` + `rag` / knowledge |
| Quét đơn | `deliveryOrders` + `vision_api` |
| Im lặng 15s × 2 | Theo dõi im lặng trong session/agent |

Bảng này giúp Chương 6 neo phép hợp kiểm thử vào đúng lớp hiện thực khi phân tích lỗi (STT, đường tắt, API, SIP…).

## Kết luận chương

Chương 5 đã trình bày bộ công nghệ và kho mã dùng chung, cách voice-agent mở phiên và xử lý từng câu nói, vai trò trip-service/auth/call, điểm chạm trên ứng dụng tài xế, các thành phần gọi khách–FAQ–quét đơn–từ khóa đánh thức, cùng ghi chú triển khai an toàn. Trên nền nguyên mẫu này, Chương 6 xây dựng phương pháp đo và báo cáo kết quả theo các chỉ số đã thống nhất từ Chương 2–3.

---

## Self-review (Chương 5 — rà từ ngữ đúng nghĩa)

| Hạng mục | Kết quả |
|---|---|
| substrate → nền tảng tích hợp | Đạt |
| inbound/outbound → trong ứng dụng / đề nghị chuyến | Đạt |
| Tên mã nguồn giữ trong `` khi cần đối chiếu Ch.6 | Đạt |
| Không lộ bí mật | Đạt |
| Không claim số đo Ch.6 | Đạt |
