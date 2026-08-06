# Trợ lý AI gọi điện cho người trong danh bạ điện thoại

> Trạng thái: **Đã lên plan, chưa triển khai** (plan được duyệt ngày 2026-07-29, code đã bị hoàn tác theo yêu cầu để review lại).
> File plan gốc: `C:\Users\Admin\.claude\plans\rosy-squishing-hamming.md` (máy Claude Code cục bộ, không nằm trong repo).

## 1. Mục tiêu & luồng sản phẩm

Tài xế đang lái xe, không thể chạm màn hình. Họ nói với trợ lý AI (giống cách đang gọi cho khách hàng hiện nay), ví dụ:

> "Gọi cho Tuấn."

AI phải:

1. Tra cứu **danh bạ điện thoại của chính tài xế** (không phải danh sách khách hàng trong hệ thống — hai nguồn dữ liệu hoàn toàn khác nhau).
2. Đọc lại tên tìm được để xác nhận. Nếu trùng nhiều người tên "Tuấn" → hỏi rõ là ai.
3. Sau khi tài xế xác nhận đúng người, hỏi tiếp tài xế muốn:
   - **AI tự gọi và nói chuyện thay** — tài xế có thể nhắn trước nội dung cụ thể muốn AI truyền đạt ("nói với anh Tuấn tôi sẽ trễ 10 phút"), sau khi cúp máy AI sẽ tóm tắt lại nội dung bên kia đã nói.
   - **Kết nối trực tiếp** — tài xế tự nói chuyện, AI chỉ có nhiệm vụ quay số.
4. Thực hiện cuộc gọi qua hạ tầng SIP có sẵn của hệ thống (không mở app điện thoại, không có `tel:` link, không cần chạm màn hình ở bất kỳ bước nào).

**Nguyên tắc bắt buộc**: toàn bộ quy trình xác nhận bằng giọng nói. Đây là yêu cầu tường minh của người dùng ("mọi thứ đều xác nhận bằng giọng nói") và cũng là lý do loại bỏ phương án dùng `Linking.openURL('tel:...')` (mở app quay số gốc của điện thoại) — cách đó luôn cần tài xế chạm tay xác nhận cuộc gọi ở màn hình hệ thống (bắt buộc trên iOS, không có ngoại lệ cho app bên thứ ba), phá vỡ trải nghiệm rảnh tay.

## 2. Phát hiện quan trọng trước khi lên plan: nhánh code đang chạy thật

Ban đầu có hai nhánh trông giống nhau trong `src/backend/voice-agent/app/`:

| Nhánh | Trạng thái |
|---|---|
| `app/agent/` + `app/tools/registry.py` (`InboundToolsMixin`, `trip_tools.py`, `customer_tools.py`, `call_tools.py`...) | **Code chết** — không được `app/main.py` → `app/agent/session.py` import ở đâu cả. |
| `app/voicebot/vn/` (`agent.py`, `tools/*.py`, `tools_definition.py`, `tools_mapping.py`, `system_instructions.py`) | **Đang chạy thật** — `session.py`'s `entrypoint` gọi `get_voicebot(lang)` → mặc định `"vn"` → `app.voicebot.vn.DriverAgent`. |

Xác nhận bằng cách đọc `app/main.py` (`entrypoint_fnc=entrypoint` từ `app.agent.session`) rồi lần theo `session.py`'s `voicebot = get_voicebot(lang)` → `voicebot.DriverAgent(...)`. Toàn bộ plan bên dưới nhắm vào nhánh `app/voicebot/vn/` đang sống, **không đụng vào nhánh chết**.

## 3. Codebase đã "để sẵn chỗ" cho tính năng này

Ba bằng chứng tìm được khi khảo sát, cho thấy đây không phải ý tưởng mới với hệ thống:

1. `app/voicebot/processors/custom_call.py` — docstring:
   > *"a future 'call from contacts' tool can resolve a saved contact's name to a phone_number and hand off to the same function instead of duplicating the dial/hand-off logic."*

   Hàm `start_bridge_call_to_number(context, phone_number, *, contact_name="", lang="vn")` trong file này dùng lại **nguyên vẹn**, không cần viết mới, cho chế độ "kết nối trực tiếp".

2. `app/voicebot/vn/tools_definition.py` — field `contact_name` của tool `call_custom_number`:
   > *"Tên người cần gọi nếu tài xế có nói... Dự phòng cho tính năng gọi theo danh bạ sau này."*

3. `trip-service/src/routes/calls.ts` + `callService.ts` — endpoint `/api/v1/calls/start` đã tổng quát sẵn: `tripId` là optional (`= ''`), chỉ bắt buộc `phoneNumber`. Nghĩa là hạ tầng gọi điện SIP dùng được cho **số bất kỳ**, không chỉ số khách hàng của chuyến — không cần sửa gì ở trip-service.

## 4. Phần thực sự mới cần xây

Chỉ có hai mảnh ghép chưa tồn tại:

### (a) Cầu nối LiveKit RPC — server hỏi ngược điện thoại của tài xế
Danh bạ chỉ tồn tại trên máy tài xế, backend (Python) không có quyền truy cập. Cần một kênh để agent (đang chạy server-side trong phòng LiveKit) hỏi ngược app di động: *"trong danh bạ có ai tên X không?"* — và nhận lại kết quả.

LiveKit hỗ trợ sẵn cơ chế này (chưa dùng ở đâu trong repo, xác nhận bằng grep toàn repo):
- Phía Python (`livekit.rtc.Participant.perform_rpc`) — agent **gọi ra**.
- Phía React Native (`livekit-client`'s `Room.registerRpcMethod`) — app **đăng ký hàm xử lý** để nhận cuộc gọi RPC đó.

### (b) Mở rộng nhẹ `CustomerCallAgent` để nhận nội dung tài xế tự nhắn
Hiện tại khi AI gọi thay khách hàng (`mode="agent"`), nó luôn mở đầu bằng câu chào cố định gắn với "khách của chuyến" (`build_customer_call_prompt`). Với người trong danh bạ cá nhân, cần thêm một tham số `custom_message` tuỳ chọn để AI mở đầu bằng đúng nội dung tài xế dặn trước — khi rỗng thì hành vi cũ (gọi khách hàng) giữ nguyên 100%, không ảnh hưởng tính năng cũ.

## 5. Kế hoạch triển khai chi tiết

### 5.1 Backend — `src/backend/voice-agent` (Python, nhánh `app/voicebot/vn/`)

#### File mới: `app/voicebot/processors/contact_call.py`
Viết theo đúng khuôn của `custom_call.py` (cùng thư mục). Chỉ cần thêm **một** hàm mới — chế độ "bridge" tái dùng thẳng hàm có sẵn, không viết lại:

```python
async def start_agent_call_to_contact(
    context: RunContext,
    phone_number: str,
    *,
    contact_name: str,
    custom_message: str = "",
    lang: str = "vn",
) -> tuple[Agent, str] | str:
    """Dial a personal contact via SIP and hand off to CustomerCallAgent,
    which optionally opens with `custom_message` instead of its generic greeting."""
```

Nội dung hàm (theo sát `customer_call.py`'s nhánh `mode="agent"`, chỉ khác `trip_id=""`):
1. Gọi `backend_api.start_call(driver_id=..., customer_id="", trip_id="", phone_number=phone_number, customer_name=contact_name, mode="agent", room_name=..., lang=lang)`.
2. Ghi lại trạng thái cuộc gọi vào `context.userdata["customer_call"]`, bật `customer_call_active=True`, tạm dừng silence tracker — sao chép logic bookkeeping đã có trong `customer_call.py`.
3. Dựng `CustomerCallAgent(lang=lang, trip={}, customer_name=contact_name, custom_message=custom_message)` và trả về `(agent, câu_thông_báo_bằng_giọng_nói)` — kiểu trả `(Agent, str)` này chính là cơ chế "handoff" gốc của SDK `livekit-agents`, agent hiện tại sẽ được thay bằng agent mới ngay trong cùng phòng.

#### Sửa: `app/voicebot/customer_call_agent.py` + `app/voicebot/prompts/customer_call.py`
- `CustomerCallAgent.__init__` nhận thêm `custom_message: str = ""`, truyền xuống `build_customer_call_prompt(..., custom_message=custom_message)`.
- `build_customer_call_prompt`: khi `custom_message` khác rỗng, đổi mục tiêu hội thoại từ "giải thích tài xế nhờ bạn gọi" thành "mở đầu bằng đúng nội dung: {custom_message}". Khi `trip_id` rỗng (trường hợp gọi danh bạ, không có chuyến), bỏ hẳn dòng "Chuyến: ..." thay vì in ra rỗng — tránh đọc như lỗi hiển thị.
- `on_enter()`: câu hint gửi cho `session.generate_reply` ở lượt nói đầu tiên cũng đổi tương tự khi có `custom_message`.
- Khi `custom_message=""` (trường hợp gọi khách hàng hiện tại) → **hành vi giữ nguyên 100%**, không có thay đổi quan sát được.

#### File mới: `app/voicebot/vn/tools/find_contact.py`
```python
@function_tool(raw_schema=raw_schema["find_contact"])
async def find_contact(raw_arguments: dict, context: RunContext) -> str:
```
Các bước:
1. Lấy `job_ctx = context.userdata["_job_ctx"]` — đã có sẵn, được `session.py`'s `entrypoint` gán vào `session_userdata["_job_ctx"] = ctx` từ đầu phiên.
2. Xác định participant của tài xế **không** bằng cách tự ghép chuỗi `f"driver-{phone}"`. Lý do: đã xác nhận có lệch dấu `+` giữa cách `trip-service/src/routes/voice.ts`'s `makeToken('driver-' + phone, ...)` đặt identity (giữ dấu `+`, vd `driver-+84901234567`) và cách `session.py`'s `_parse_room` tự ghép lại identity từ tên phòng đã bị strip dấu `+` (`driver-84901234567`) — hai chuỗi lệch nhau, dùng để gọi RPC sẽ tìm nhầm đích. Thay vào đó, duyệt trực tiếp participant đang có mặt trong phòng:
   ```python
   from livekit import rtc
   driver_participant = next(
       (p for p in job_ctx.room.remote_participants.values()
        if p.kind == rtc.ParticipantKind.PARTICIPANT_KIND_STANDARD),
       None,
   )
   ```
   (`PARTICIPANT_KIND_STANDARD` phân biệt với `PARTICIPANT_KIND_SIP` — quan trọng nếu lúc này đang có một cuộc gọi SIP khác cùng tồn tại trong phòng.)
3. Gọi RPC:
   ```python
   payload = json.dumps({"query": contact_name})
   response = await job_ctx.room.local_participant.perform_rpc(
       destination_identity=driver_participant.identity,
       method="search_contacts",
       payload=payload,
       response_timeout=8.0,
   )
   ```
   Bọc `try/except` cho `livekit.rtc.RpcError` (timeout, hoặc app chưa đăng ký handler — bản cũ chưa cập nhật) → trả về câu lỗi thoại thân thiện.
4. Parse JSON `{"matches": [{"name", "phone_number"}, ...]}` hoặc `{"error": "..."}`:
   - **0 kết quả** → xoá mọi pending state, trả `"Không tìm thấy {tên} trong danh bạ."`
   - **1 kết quả** → lưu `context.userdata["pending_contact_call"] = {"name": ..., "phone_number": ...}`, trả câu đọc lại tên + hỏi xác nhận (văn phong giống `call_custom_number`'s "đúng không?").
   - **≥2 kết quả** → lưu `context.userdata["pending_contact_matches"] = [...]` (giới hạn 5 người), đọc danh sách tên, hỏi tài xế chọn ai.

#### File mới: `app/voicebot/vn/tools/select_contact_match.py`
Chỉ cần khi bước trên trả về nhiều kết quả. Nhận `raw_arguments["selection"]` (văn bản tự do tài xế nói, ví dụ "người đầu tiên" hoặc "Tuấn kho"), so khớp với danh sách trong `pending_contact_matches`. Khớp đúng 1 người → promote thành `pending_contact_call`, xoá `pending_contact_matches`, trả câu xác nhận giống nhánh "1 kết quả" ở trên. Không khớp/khớp nhiều hơn 1 → hỏi lại, giữ nguyên state chờ.

#### File mới: `app/voicebot/vn/tools/confirm_contact_call.py`
```python
@function_tool(raw_schema=raw_schema["confirm_contact_call"])
async def confirm_contact_call(raw_arguments: dict, context: RunContext):
```
- Đọc `mode` (`"bridge"` hoặc `"agent"`) và `message` (tuỳ chọn, chỉ có ý nghĩa khi `mode="agent"`).
- `pending = context.userdata.get("pending_contact_call")` — thiếu thì trả lỗi `ERR_NO_PENDING_CONTACT_CALL`. Có thì xoá pending ngay (tránh gọi lặp nếu AI lỡ gọi tool 2 lần).
- `mode == "bridge"` → `return await custom_call.start_bridge_call_to_number(context, pending["phone_number"], contact_name=pending["name"], lang="vn")`.
- `mode == "agent"` → `return await contact_call.start_agent_call_to_contact(context, pending["phone_number"], contact_name=pending["name"], custom_message=(raw_arguments.get("message") or ""), lang="vn")`.

**Điểm an toàn quan trọng**: không có tool nào trong luồng phải gõ lại số điện thoại qua tham số tự do do LLM tự điền — số điện thoại chỉ đi từ kết quả RPC (JSON có cấu trúc) thẳng vào `context.userdata`, không bao giờ đi qua "trí nhớ" của LLM. Đây chính là rủi ro mà `call_custom_number`'s docstring gốc đã cảnh báo (AI nghe nhầm số khi tài xế đọc số qua giọng nói) — và ở đây rủi ro đó không tồn tại vì số không bao giờ được đọc ra rồi gõ lại.

#### Sửa: `app/voicebot/vn/constants.py`
Thêm 2 hằng số lỗi theo đúng văn phong hiện có (cạnh `ERR_INVALID_CUSTOM_PHONE`, `ERR_NO_PENDING_CUSTOM_CALL`):
```python
ERR_CONTACT_RPC_FAILED    = "Không thể truy cập danh bạ trên điện thoại lúc này. Anh/chị thử lại sau nhé."
ERR_NO_PENDING_CONTACT_CALL = "Không có yêu cầu gọi điện nào đang chờ xác nhận."
```

#### Sửa: `app/voicebot/vn/tools_definition.py`
Thêm 3 entry `raw_schema` mới (`find_contact`, `select_contact_match`, `confirm_contact_call`), đặt cạnh `call_custom_number`/`confirm_call_custom_number` hiện có. `confirm_contact_call` cần 2 tham số:
- `mode`: `{"type": "string", "enum": ["bridge", "agent"]}`, bắt buộc.
- `message`: `{"type": ["string", "null"]}`, tuỳ chọn — mô tả "Nội dung tài xế muốn AI nhắn lại cho người này, chỉ dùng khi mode=agent."

#### Sửa: `app/voicebot/vn/agent.py`
Import 3 hàm tool mới, thêm vào danh sách `_DRIVER_INBOUND_TOOLS`, ngay dưới nhóm `call_customer, call_custom_number, confirm_call_custom_number` (dòng 71-73 hiện tại).

#### Sửa: `app/voicebot/vn/tools_mapping.py`
Thêm khối hướng dẫn định tuyến mới, đặt ngay sau khối `## Tool: call_custom_number → confirm_call_custom_number` (dòng 52-60), cùng văn phong:
```
## Tool: find_contact → (select_contact_match) → confirm_contact_call
- Khi dùng: tài xế muốn gọi một người TRONG DANH BẠ ĐIỆN THOẠI qua tên,
  "gọi cho Tuấn", "gọi giúp tôi anh Tuấn"
- LUÔN theo các bước:
  1. find_contact(contact_name) → đọc lại tên tìm được để xác nhận,
     hoặc hỏi chọn nếu nhiều kết quả
  2. Nếu nhiều kết quả và tài xế nói rõ hơn → select_contact_match(selection)
  3. Tài xế xác nhận đúng người → HỎI CHẾ ĐỘ (giống call_customer):
     AI tự gọi/tóm tắt hay kết nối trực tiếp?
     Nếu chọn AI tự gọi, hỏi thêm có muốn nhắn nội dung gì không (điền vào message)
  4. confirm_contact_call(mode, message?) → thực hiện cuộc gọi thật
- Không tự đoán/tự gọi số khi chưa xác nhận đúng người
```

#### Sửa: `app/voicebot/vn/system_instructions.py`
Thêm 1 dòng vào mục "Liên lạc khách hàng" trong `CÁC CHỨC NĂNG`:
```
- CALL_CONTACT — gọi người trong danh bạ điện thoại của tài xế (tìm tên → xác nhận → chọn chế độ)
```

#### Không cần sửa
- `app/services/backend_api.py`, `trip-service/src/routes/calls.ts`, `callService.ts` — `start_call` / `/api/v1/calls/start` đã tổng quát sẵn cho số bất kỳ.
- `sip_call_watch.py`, `handback.py`, `customer_call_tools.py` (`end_customer_call`) — cơ chế kết thúc cuộc gọi và bàn giao lại `DriverAgent` khi cúp máy đã tổng quát, không phân biệt cuộc gọi tới khách hay tới người trong danh bạ.

### 5.2 Frontend — `src/frontend/driver-app` (Expo / React Native)

#### Dependency mới
```bash
cd src/frontend/driver-app
npx expo install expo-contacts
```

#### File mới: `src/features/home/services/contactsSearch.ts`
```ts
export async function searchContacts(query: string): Promise<{ name: string; phone_number: string }[]>
```
- Xin quyền **lười** (lazy) — chỉ gọi `Contacts.requestPermissionsAsync()` ngay trong hàm này ở lần dùng đầu tiên, không xin trước khi bật "Trợ lý rảnh tay". Đúng theo quy ước đã có sẵn trong app: `app/(app)/add-delivery.tsx` xin quyền camera ngay lúc bấm chụp ảnh, không xin trước — tránh làm phiền tài xế xin quyền cho tính năng họ có thể chẳng bao giờ dùng tới.
- Bị từ chối quyền → trả về mảng rỗng kèm cờ lỗi, để tầng gọi RPC map thành `{"error": "permission_denied"}` gửi ngược cho backend.
- Truy vấn: `Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers], name: query })`.
- Mỗi người chỉ lấy **số điện thoại đầu tiên** — giữ payload gọn, và vì luồng sản phẩm đã chốt chỉ cần phân biệt "gọi cho ai" chứ không cần phân biệt "gọi vào số nào trong nhiều số của người đó".
- Giới hạn tối đa **5 kết quả** trả về (khớp giới hạn phía Python).

#### Sửa: `src/features/home/stores/voiceSessionStore.ts`
Trong `connectWithToken`, ngay cạnh khối đăng ký `r.on(RoomEvent.DataReceived, ...)` / `r.registerTextStreamHandler(...)` đã có (trước dòng `await r.connect(...)`), thêm:
```ts
r.registerRpcMethod('search_contacts', async (data) => {
  try {
    const { query } = JSON.parse(data.payload)
    const matches = await searchContacts(query)
    return JSON.stringify({ matches })
  } catch (err) {
    return JSON.stringify({ error: String(err) })
  }
})
```
Không cần gọi `unregisterRpcMethod` khi ngắt kết nối — `Room` cũ bị bỏ hẳn (`room = null`) và mỗi lần `connectWithToken` chạy lại sẽ tạo `Room` hoàn toàn mới, không có gì để rò rỉ (đúng cách các listener khác trong file này cũng đang làm).

#### Sửa: `app.json`
- `ios.infoPlist`: thêm
  ```json
  "NSContactsUsageDescription": "Czen Driver needs contacts access so the AI assistant can call people from your phone by name."
  ```
  (cùng văn phong với `NSMicrophoneUsageDescription`/`NSCameraUsageDescription` đã có).
- `android.permissions`: thêm **một lần duy nhất** `"android.permission.READ_CONTACTS"`.
  > ⚠️ Lưu ý: mảng `permissions` hiện tại đang bị lặp nguyên vẹn 2 lần (10 quyền giống hệt nhau, dòng 32-51 của `app.json`) — đây là lỗi có sẵn từ trước, **không thuộc phạm vi tính năng này**, chỉ thêm dòng mới chứ không nhân đôi thêm.
- `plugins`: thêm `"expo-contacts"` (chuỗi trần, giống cách `"expo-secure-store"` đã khai báo).

#### Không cần sửa
- `AssistantChatPanel.tsx` — `isCallActive`/`MIC_LABEL` đã điều khiển tổng quát qua data-channel topic `call_state` (không phân biệt cuộc gọi tới khách hay tới danh bạ), bong bóng chat đã tự hiển thị mọi lời AI nói qua transcription có sẵn.

## 6. Kiểm thử

- `cd src/frontend/driver-app && npx tsc --noEmit -p .` sau khi thêm `voiceSessionStore.ts` + file mới.
- Backend Python: hiện không có test suite cho `app/voicebot/vn/tools/*` — giữ các file mới cùng hình dạng với `call_custom_number.py`/`confirm_call_custom_number.py` để dễ review, không tự dựng thêm framework test riêng cho việc này.
- **Không thể chạy thử pipeline LiveKit thật trong môi trường phát triển hiện tại** (cần STT/TTS/LiveKit cloud credentials thật + điện thoại có danh bạ thật). Cần tự test trên thiết bị thật:
  1. Bật "Trợ lý rảnh tay" hoặc bấm mic.
  2. Nói "gọi cho [tên có trong danh bạ]".
  3. Kiểm tra cả 3 nhánh: 0 kết quả / 1 kết quả / nhiều kết quả trùng tên.
  4. Kiểm tra cả 2 chế độ: `agent` (AI gọi thay + tóm tắt) và `bridge` (kết nối trực tiếp).

## 7. Rủi ro / điều chưa chốt — cần xác nhận thêm khi triển khai

- **Chỉ hỗ trợ tiếng Việt (`vn`) ở bản đầu.** Tiền lệ gần nhất (`call_custom_number`) cũng chỉ có bản VN, chưa có bản `en`. Nếu cần hỗ trợ cả tiếng Anh, khối lượng việc tăng gần gấp đôi (phải nhân bản toàn bộ 3 tool file + cập nhật `tools_definition`/`tools_mapping`/`system_instructions` sang `app/voicebot/en/`).
- **Chỉ hỗ trợ mode `bridge`/`agent`, không hỗ trợ `background`** cho cuộc gọi tới danh bạ cá nhân. Mode `background` (AI gọi ngầm trong khi tài xế làm việc khác) hợp lý hơn cho "khách của chuyến" — với người thân/bạn bè cá nhân, để dành cho bản sau nếu tài xế thực sự cần.
- **So khớp tên tiếng Việt có dấu**: cần kiểm tra thực tế bộ lọc `name` của `Contacts.getContactsAsync` trong `expo-contacts` xử lý lệch dấu tốt đến đâu (ví dụ STT nghe ra "Tuấn" nhưng danh bạ lưu không dấu "Tuan", hoặc ngược lại). Nếu bộ lọc của hệ điều hành không đủ tốt, `contactsSearch.ts` sẽ cần tự chuẩn hoá bỏ dấu để so khớp thay vì chỉ dựa vào filter có sẵn — đây là việc cần làm ngay khi bắt tay triển khai, không đoán trước bằng suy luận.

---

*Tài liệu này mô tả plan đã được duyệt nhưng **chưa triển khai** — code cho tính năng đã được viết một lần rồi hoàn tác theo yêu cầu review lại. Khi bắt đầu code thật, cập nhật dòng trạng thái ở đầu file này.*
