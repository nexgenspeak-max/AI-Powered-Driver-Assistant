# FEAT-M006 — Tài xế gửi SMS qua trợ lý giọng nói (khách hàng / danh bạ / số bất kỳ)

| | |
|---|---|
| **Loại** | Feature |
| **Service** | `call-center`, `trip-service`, `voice-agent` (VN driver agent) |
| **Ưu tiên** | 🟡 Trung bình |
| **Trạng thái** | 🔴 Code chạy đúng đầu-cuối (voice-agent → trip-service → call-center → Twilio, đã test thật bằng giọng nói) nhưng **bị chặn cứng bởi nhà mạng Việt Nam** — không phải lỗi cấu hình Twilio, không tự sửa được bằng code hay bật thêm setting nào. **Tạm dừng, chưa cần làm tiếp** cho tới khi chọn hướng thay thế (xem "Nguyên nhân chặn" + "Ý tưởng chưa làm" bên dưới). Đã sửa thêm 1 bug thật: `send_sms_to_customer` từng báo "đã gửi" dù gửi thất bại (do gửi kiểu fire-and-forget, không chờ kết quả) |
| **Liên quan** | [01_BACKLOG.md](../01_BACKLOG.md), [FEAT-M004](FEAT-M004.md) (không bị ảnh hưởng — tách biệt) |

## Vì sao làm

Trước đây tài xế không có cách nào gửi tin nhắn thật từ trong app. Chỗ duy nhất "giống" SMS
là 1 stub — `POST /trips/:tripId/confirm-with-customer` (`trip-service/src/routes/trips.ts`)
chỉ `console.info` ra log `[sms-stub]` rồi trả `{status:'sent'}`, không hề gọi nhà cung cấp SMS
thật nào. Người dùng muốn: trong lúc nói chuyện với trợ lý giọng nói, tài xế có thể nhờ AI gửi
tin nhắn — tới khách hàng của chuyến đang chạy, tới người trong danh bạ điện thoại (theo tên),
hoặc tới bất kỳ số nào tài xế đọc ra — với nội dung tự do do tài xế dictate, gửi thật qua tài
khoản Twilio đã có sẵn (đang dùng cho gọi thoại ở `call-center`).

Tính năng này mô phỏng lại đúng pattern đã có cho **cuộc gọi**: `call_customer`,
`call_custom_number` → `confirm_call_custom_number` (số tự do, xác nhận 2 bước), và
`find_contact` → `select_contact_match` → `confirm_contact_call` (tra danh bạ qua RPC tới máy
tài xế) — tận dụng tối đa hạ tầng đã có, không đụng vào tính năng gọi điện đang chạy tốt.

## Kiến trúc

- **`call-center`** — nơi duy nhất cầm Twilio credentials (Account SID/Auth Token/Phone Number
  đã có sẵn từ trước, dùng cho gọi thoại). Thêm `callService.sendSms()` (dùng lại `getClient()`
  hiện có, gọi `.messages.create(...)` thay vì `.calls.create(...)`) + route mới
  `POST /api/v1/sms/send`.
- **`trip-service`** — **không** cầm Twilio credentials, chỉ lo nghiệp vụ chuyến xe: resolve
  "chuyến này khách là ai" (nếu có `tripId`) rồi `fetch()` thẳng sang call-center để thực thi
  gửi. `config.callCenterUrl` (đã tồn tại từ trước, chưa dùng bao giờ) giờ mới có nơi dùng đầu
  tiên. Route mới `POST /api/v1/sms/send` nhận `{tripId?, phoneNumber?, message}` — xử lý được
  cả 3 trường hợp (khách của chuyến / số đã resolve từ danh bạ / số tự do) bằng 1 endpoint,
  giống cách `calls.ts`'s `/start` đang resolve số cho cuộc gọi.
- **`voice-agent`** (VN driver agent only — EN agent chưa có các tool gọi-điện tương ứng nên
  không có gì để mô phỏng) — 6 tool mới trong `app/voicebot/vn/tools/`, dùng các
  `context.userdata` key riêng (`pending_custom_sms`, `pending_contact_sms`,
  `pending_contact_sms_matches`) để không đụng state của luồng gọi điện hiện có:

| Tool | Mô phỏng theo | Vai trò |
|---|---|---|
| `send_sms_to_customer` | `confirm_trip_with_customer.py` | Gửi thẳng cho khách của chuyến đang chạy, nội dung tự do, không cần bước xác nhận (số đã có sẵn) |
| `send_sms_to_custom_number` → `confirm_send_sms_to_custom_number` | `call_custom_number` → `confirm_call_custom_number` | Số tự do tài xế đọc ra — xác nhận 2 bước (đọc lại cả số lẫn nội dung, không chỉ số) |
| `find_contact_to_message` → `select_contact_match_for_sms` → `confirm_send_sms_to_contact` | `find_contact` → `select_contact_match` → `confirm_contact_call` | Tra danh bạ theo tên qua RPC `search_contacts` có sẵn (không sửa gì driver-app), rồi gửi |

Tận dụng lại (không viết mới): `custom_call.is_valid_vn_phone`/`normalize_vn_phone`/
`format_for_speech` (validate/format số), RPC `search_contacts` đã đăng ký sẵn ở driver-app
(`voiceSessionStore.ts` + `contactsSearch.ts`, dùng `expo-contacts` — **zero thay đổi
driver-app**), `context_store.get_current_trip()`/`schedule_sync()`.

## Kết quả test thật (2026-08-06)

- **Luồng giọng nói driver-app + voice-agent local**: nói "Nhắn cho khách bảo này đường tắc
  quá" → `send_sms_to_customer` được gọi đúng, `trip_id` resolve đúng từ chuyến đang hoạt động,
  request đi đúng đường voice-agent → trip-service → call-center → Twilio.
- **Phát hiện + đã sửa 1 bug thật**: `send_sms_to_customer.py` ban đầu dùng
  `context_store.schedule_sync()` (gửi nền, không chờ kết quả, giống
  `confirm_trip_with_customer.py`) — khi backend trả lỗi, exception chỉ bị log, AI vẫn nói
  "Đã gửi tin nhắn cho khách..." dù thực tế gửi thất bại. Đã sửa thành `await` trực tiếp + trả
  `ERR_SMS_SEND_FAILED` nếu thất bại, để tài xế biết đúng thực tế thay vì bị AI báo sai kết quả.
  2 tool "confirm_send_sms_to_..." còn lại vốn đã `await` trực tiếp từ đầu, không có bug này.

## Nguyên nhân chặn: nhà mạng Việt Nam, không phải lỗi code/Twilio config

Đào sâu qua nhiều bước test thật (gọi thẳng Twilio REST API để lấy mã lỗi chính xác, tra
capability số, tra danh sách quốc gia Twilio hỗ trợ mua số) mới ra được nguyên nhân gốc:

- Test gửi SMS thật: Twilio trả lỗi **21612** — "Message cannot be sent with the current
  combination of 'To' and 'From' parameters". Không phải do thiếu bật Geo Permissions (đã bật
  Vietnam, vẫn lỗi y hệt) và không phải do số Twilio thiếu capability SMS (tra API xác nhận
  `sms: true`).
- Tra chính sách Twilio cho Việt Nam
  (twilio.com/en-us/guidelines/vn/sms): **"Vietnam mobile operators require pre-registration
  of Alphanumeric Sender IDs and message templates"**, và **"enforcement of complete blocking
  of unregistered Sender IDs in Vietnam is on August 25, 2025"** — tức từ mốc đó, nhà mạng VN
  (Viettel/Mobifone/Vinaphone) **chặn cứng mọi SMS A2P (ứng dụng gửi hàng loạt) chưa đăng ký
  Brand Name**, không có cách nào lách qua bằng code hay cấu hình tài khoản.
- Thử dùng số Twilio khác (`+18777804236`, số toll-free) — số này **không thuộc tài khoản
  Twilio hiện tại** (lỗi 21660), và tra API `AvailablePhoneNumbers/VN.json` → **404, Twilio
  không bán số điện thoại Việt Nam cho bất kỳ ai** (không có tư cách pháp nhân viễn thông tại
  VN) — nên hướng "mua thêm số" cũng không giải quyết được gì.
- **Kết luận**: đây là giới hạn pháp lý của Việt Nam (chống spam SMS), áp dụng cho MỌI nhà cung
  cấp SMS nước ngoài, không riêng Twilio. Đường duy nhất giữ Twilio là đăng ký **Alphanumeric
  Sender ID cho Việt Nam** qua Twilio Console (self-service nộp hồ sơ, đội Sender ID của Twilio
  duyệt thủ công **~5 tuần**), sau đó đổi `from` trong `messages.create()` từ số điện thoại
  sang chuỗi Sender ID đã duyệt (vd `"CZEN"`), và nội dung tin nhắn bắt buộc phải chứa tên
  brand trùng Sender ID, không được chứa link/URL/số điện thoại khác trong thân tin.
  **Hướng nhanh hơn khác**: chuyển hẳn sang nhà mạng SMS trong nước (eSMS.vn/SpeedSMS/
  Stringee...) — họ đã có sẵn Brand Name đăng ký hợp lệ, chạy được ngay không cần chờ.

## Ý tưởng chưa làm: gửi SMS bằng SIM thật của tài xế (P2P, không qua Twilio)

Người dùng đề xuất: thay vì gửi qua cổng SMS backend (A2P — bị luật VN chặn), dùng chính SIM
điện thoại của tài xế để gửi (P2P — tin nhắn người-gửi-người bình thường, **không thuộc phạm vi
quy định Sender ID** vì không phải gửi hàng loạt từ hệ thống).

Về mặt kỹ thuật (driver-app dùng Expo/React Native, module liên quan: `expo-sms`):
- **iOS**: Apple **không cho phép** bất kỳ app bên thứ 3 nào gửi SMS ngầm/tự động — chỉ mở
  được khung soạn tin nhắn native (điền sẵn số + nội dung), tài xế **bắt buộc tự bấm Gửi**.
  Không có cách lách.
- **Android**: về lý thuyết có quyền `SEND_SMS` cho gửi ngầm không cần chạm màn hình, nhưng
  Google Play Store hạn chế rất chặt quyền này (chỉ app được khai "ứng dụng nhắn tin mặc định"
  mới dùng được) — app đặt xe xin quyền này rủi ro cao bị Google từ chối duyệt/gỡ app.
- Vậy hướng khả thi thực tế: AI điền sẵn số khách + nội dung tài xế vừa đọc → mở app Nhắn tin
  native trên máy → tài xế bấm Gửi 1 cái. Không 100% rảnh tay như thiết kế ban đầu (AI tự gửi
  xong luôn), nhưng không cần Twilio/nhà mạng, không tốn phí, chạy được ngay.

**Chưa triển khai** — người dùng chủ động dừng lại, chưa cần làm gấp. Nếu làm sau, đây sẽ là
một luồng khác hẳn kiến trúc hiện tại (chạy hoàn toàn trên driver-app qua `expo-sms`, không
qua `call-center`/Twilio/`trip-service`'s `smsService` — có thể vẫn giữ song song 2 luồng: gọi
API backend cho các trường hợp cần thật rảnh tay/không cần SIM thật, và `expo-sms` cho trường
hợp cần chắc chắn gửi được tới số VN ngay).

## Chưa làm / hạn chế còn lại

- **Đang tạm dừng chờ quyết định hướng đi** — không code tiếp cho tới khi chọn 1 trong 3: (a)
  đăng ký Sender ID Twilio (~5 tuần), (b) chuyển nhà mạng SMS VN (chạy ngay), (c) làm luồng
  `expo-sms` dùng SIM tài xế (chạy ngay, nhưng cần tài xế bấm Gửi thủ công).
- **Chưa test giọng nói cho 2 luồng còn lại**: `send_sms_to_custom_number`→
  `confirm_send_sms_to_custom_number` (số tự do) và `find_contact_to_message`→...→
  `confirm_send_sms_to_contact` (theo danh bạ) — chỉ mới test được `send_sms_to_customer`.
- **Chưa test hồi quy** cho các luồng gọi điện hiện có (`call_customer`, `call_custom_number`,
  `find_contact`→`confirm_contact_call`) sau khi thêm code mới — về lý thuyết không ảnh hưởng gì
  vì chỉ thêm file mới + key `userdata` mới, nhưng chưa xác nhận bằng test thật.
- Có báo cáo mất kết nối phiên voice ngay sau lần test đầu — xảy ra cùng lúc với lỗi SMS 503
  nhưng exception đã được try/except bắt gọn trong `_sync()`/`await`, không thấy đường nào
  propagate ra ngoài làm crash session; **chưa xác nhận được đây có phải do tính năng này gây
  ra hay là sự cố kết nối không liên quan** — cần theo dõi thêm ở lần test tiếp theo.
- Endpoint stub cũ `POST /trips/:tripId/confirm-with-customer` (câu xác nhận mẫu cố định) giữ
  nguyên, không nối sang `smsService` thật trong lần này — có thể làm sau nếu cần.
- Chỉ agent tiếng Việt (VN) của tài xế — không làm cho EN hay customer agent.

## Cách test

1. **call-center** (chỗ gọi Twilio thật): `curl -X POST http://localhost:8000/api/v1/sms/send -d '{"phoneNumber":"...","message":"test"}'` → kỳ vọng `{"status":"...","sid":"SM..."}` và nhận được SMS thật. **Hiện đang trả lỗi 21612 cho số VN — bị nhà mạng VN chặn ở tầng carrier, xem "Nguyên nhân chặn" ở trên**, không tự hết bằng cách sửa cấu hình Twilio.
2. **trip-service proxy**: `curl -X POST http://localhost:8002/api/v1/sms/send -d '{"phoneNumber":"...","message":"test qua trip-service"}'` → phải nhận SMS y hệt bước 1 (cần JWT hợp lệ, route có `authenticate` middleware).
3. **Luồng giọng nói**: driver-app + voice-agent local, 1 chuyến đang `confirmed` — thử "nhắn tin cho khách là tôi sắp tới", "nhắn tin cho số 09xx... nội dung...", "nhắn cho [tên trong danh bạ] là...".
