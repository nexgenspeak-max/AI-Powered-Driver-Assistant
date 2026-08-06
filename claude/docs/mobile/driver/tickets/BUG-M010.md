# BUG-M010 — Gọi khách hàng/danh bạ AI trả lời tốt cả 3 chế độ, nhưng tóm tắt cuộc gọi báo sai

| | |
|---|---|
| **Loại** | Bug |
| **Service** | voice-agent (`app/agent/session.py`, `app/services/conversation_service.py`, `app/voicebot/processors/sip_call_watch.py`, `app/voicebot/tools/customer_call_tools.py`, `app/voicebot/processors/handback.py`), trip-service (`src/services/callService.ts`, `src/routes/calls.ts`) |
| **Mức độ** | 🔴 Cao (dữ liệu tài xế nhận được sau cuộc gọi sai sự thật) |
| **Trạng thái** | ✅ Đã sửa |
| **Liên quan** | [04_BUG_TRACKER.md](../04_BUG_TRACKER.md) |

## Mô tả

Tính năng "trợ lý AI gọi điện thay tài xế" có 3 chế độ (chọn khi tài xế nói muốn gọi khách/người trong danh bạ):

1. **Chế độ 1 — nền (`mode="background"`)**: AI tự gọi trong 1 phòng LiveKit riêng, tài xế vẫn dùng app bình thường, hỏi lại sau bằng "tóm tắt cuộc gọi"/"gọi xong chưa".
2. **Chế độ 2 — agent (`mode="agent"`)**: AI gọi và nói chuyện thay, tài xế nghe trực tiếp cùng phòng.
3. **Chế độ 3 — bridge (`mode="bridge"`)**: AI chỉ quay số, tài xế tự nói chuyện trực tiếp với người kia.

Cả 3 chế độ: cuộc gọi kết nối tốt, AI nói chuyện/trả lời bình thường. Nhưng khi tra lại kết quả sau cuộc gọi (đặc biệt chế độ 1), tài xế nhận được thông tin **sai sự thật**:

- Báo *"khách hàng bắt máy"* (như đang gọi dở) dù cuộc gọi đã kết thúc từ lâu.
- Báo *"không thể trò chuyện với khách (không bắt máy hoặc im lặng kéo dài)"* dù khách **đã trả lời đầy đủ mọi câu hỏi** và AI đã xác nhận xong thông tin.
- LiveKit Cloud dashboard (Telephony → Calls) vẫn hiện trạng thái **ACTIVE** dù AI đã báo "cuộc gọi đã kết thúc" cho tài xế.

## Nguyên nhân (4 bug độc lập, cộng dồn)

### 1. Trạng thái cuộc gọi dùng chung 1 ô nhớ cho cả 3 chế độ, chỉ chế độ 1 biết đóng nó lại
`trip-service/src/services/callService.ts::startCustomerCall` — cả 3 chế độ đều ghi `status:'in_progress'` vào **cùng một** Redis key `driverLastCallKey(driverPhone)` khi bắt đầu gọi. Nhưng chỉ chế độ 1 (background) có đường gọi `completeCustomerCall` để đổi thành `'completed'`. Nếu sau một cuộc gọi nền đã hoàn thành, tài xế gọi tiếp ở chế độ 2/3, request bắt-đầu-gọi đó **ghi đè** ô nhớ chung về `in_progress` — và không bao giờ có ai đổi lại. Mọi lần hỏi "gọi xong chưa" sau đó đọc nhầm đúng bản ghi cũ này.

**Sửa**: gộp việc đánh dấu "đã hoàn thành" vào đúng 1 hàm dùng chung cho mọi đường kết thúc cuộc gọi — `store_call_summary()` (`app/voicebot/processors/handback.py`) — giờ tất cả 3 chế độ (qua `handback_to_driver`, `handback_to_customer`, `end_bridge_call`, `end_customer_call`) đều tự gọi `backend_api.complete_background_call(...)` khi kết thúc, không riêng gì chế độ 1 nữa.

### 2. `delete_room` không chắc chắn ngắt được cuộc gọi SIP thật
`sip_call_watch.py::complete_isolated_call` và `customer_call_tools.py::_finish_isolated_call` chỉ gọi `job_ctx.api.room.delete_room(...)` để "dọn" cuộc gọi nền — không chủ động gọi `remove_participant` cho participant SIP. Quan sát thực tế trên LiveKit Cloud dashboard: phòng bị xoá, backend đã đánh dấu hoàn thành, tài xế đã được báo "kết thúc" — nhưng dòng điện thoại thật vẫn **ACTIVE**.

**Sửa**: thêm bước `disconnect_sip_participant(...)` (ngắt SIP participant tường minh) **trước** khi xoá phòng, ở cả 2 nơi.

### 3. Bộ đếm im lặng dùng 1 câu tóm tắt cứng cho mọi lý do kết thúc
`app/agent/session.py::_on_isolated_silence_timeout` (bộ đếm: 5 giây không ai nói — cả AI lẫn khách — thì tự kết thúc cuộc gọi nền) dùng **nguyên văn 1 câu cố định** — *"Không thể trò chuyện với khách (không bắt máy hoặc im lặng kéo dài)"* — bất kể lý do gì kích hoạt timeout. Cơ chế 5 giây này cố tình làm rất nhạy (xem mục "Quyết định thiết kế" trong `05_DECISIONS.md` nếu có ghi, hoặc lịch sử hội thoại) để bắt cả trường hợp khách cúp máy — nhưng hệ quả phụ: nó cũng dễ bắt trúng đúng khoảnh khắc **cuộc gọi đã diễn ra trọn vẹn**, 2 bên vừa nói xong và cùng im lặng một nhịp (hoặc AI chỉ đơn giản là chậm gọi `end_customer_call`) — lúc đó timeout thắng, và tài xế bị báo sai là "không liên lạc được".

**Sửa**: kiểm tra cờ `_customer_spoke` trước khi chọn câu tóm tắt — nếu khách **đã từng nói** trong cuộc gọi, dùng tóm tắt thật lấy từ transcript thật (`conversation_service.py::generate_summary()`, gọi GPT-4o-mini đọc đúng nội dung đã trao đổi) thay vì câu tóm tắt "không liên lạc được". Chỉ khi khách **thực sự chưa nói gì** mới giữ câu cũ.

### 4. Tóm tắt tự sinh gắn nhầm vai trò "tài xế" cho lời khách hàng
`conversation_service.py::_generate_summary()` gắn nhãn `"Tài xế"` cho mọi lượt nói có `role=="user"`, và prompt hệ thống mô tả cứng "hội thoại giữa tài xế và trợ lý AI" — đúng cho phòng chính (tài xế nói chuyện với AI), nhưng **sai** cho phòng gọi nền (`custcall-*`), nơi `role=="user"` thực chất là **khách hàng** đang nói với AI (AI gọi thay tài xế). Đồng thời phát hiện thêm: bản ghi được lưu (POST tới call-logger) dưới `call_id = ctx.room.name` (tên phòng), khác với `call_id` thật mà trip-service dùng để tra cứu (`"{room_name}-{sip_identity}"`) — bản ghi transcript coi như bị "mồ côi", lưu xong nhưng không ai tra ra được.

**Sửa**: `ConversationService.attach()` giờ nhận diện đúng phòng gọi nền (`userdata["isolated_call"]`), lấy đúng `call_id`/số điện thoại khách hàng từ `session.userdata["customer_call"]` (vốn đã đọc từ metadata phòng), và `_generate_summary()` đổi nhãn/đổi prompt tóm tắt tuỳ theo có phải cuộc gọi nền hay không.

## Việc đã làm (thêm, ngoài 4 sửa trên)

- **Tự động tóm tắt khi cuộc gọi nền kết thúc, không cần tài xế hỏi**: thêm trường `driver_room_name` xuyên suốt (`callService.ts` → metadata phòng nền → `session_userdata`), khi cuộc gọi nền kết thúc thì `notify_driver_of_background_call_result()` (`handback.py`) dùng LiveKit server API `send_data` đẩy thẳng tóm tắt vào **phòng chính của tài xế** (khác job/phòng với phòng gọi nền) — tài xế trong phòng chính có handler lắng nghe topic `background_call_summary` (`session.py`, mode `driver`/`outbound`) và AI chủ động nói tóm tắt ngay, không cần tài xế phải hỏi lại.
- Cơ chế 5 giây im lặng → tự kết thúc (chế độ 1) và cơ chế "chào tạm biệt rồi chờ 5 giây mới cúp máy" (khi khách/AI chủ động kết thúc, mọi chế độ) **giữ nguyên**, không bị các sửa trên ảnh hưởng.

## Ghi chú

- Đây là 4 bug độc lập nhưng cùng biểu hiện ra ngoài là "thông tin sau cuộc gọi sai/thiếu" — người dùng báo gộp chung một lần ("sao AI lại không nhận được dữ liệu và báo là cuộc gọi khách hàng bắt máy", "sao báo không kết nối được dù khách đã nói chuyện xong"), phải tách từng lớp mới ra hết 4 nguyên nhân.
- Bug #3 và #4 chỉ ảnh hưởng chế độ 1 (nền) — chế độ 2/3 không đi qua `_on_isolated_silence_timeout` hay gắn nhãn "user=Tài xế" sai vì phòng của chúng chính là phòng tài xế thật.
- Bug #1 và #2 ảnh hưởng chung cả 3 chế độ.
