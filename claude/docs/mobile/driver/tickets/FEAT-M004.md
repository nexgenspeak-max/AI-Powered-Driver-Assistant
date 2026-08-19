# FEAT-M004 — Tự động gọi khách hàng khi tài xế gần điểm đón

| | |
|---|---|
| **Loại** | Feature |
| **Service** | driver-app, `trip-service`, `voice-agent` |
| **Ưu tiên** | 🟡 Trung bình |
| **Trạng thái** | 🔨 Bản gốc (gọi thẳng khách) đã code xong, backend/voice-agent test thật OK, **frontend chờ test thiết bị thật**. **2026-08-07: mở rộng thêm 3 việc** (đổi tracking sang 10 phút/mọi lúc online, hỏi tài xế trước khi gọi thay vì tự động, gợi ý điểm dừng tiếp theo) — xem mục "Cập nhật 2026-08-07" bên dưới. Toàn bộ phần mở rộng **đã code + tự kiểm tra xong (unit-level), chưa test bằng hạ tầng LiveKit/SIP thật**, và nằm sau 2 feature flag tắt mặc định nên hành vi production không đổi cho tới khi bật |
| **Liên quan** | [01_BACKLOG.md](../01_BACKLOG.md) |
| **Plan gốc** | `C:\Users\Admin\.claude\plans\merry-wobbling-nest.md` (máy Claude Code cục bộ, không nằm trong repo) |

## Mô tả

Khi tài xế đang trên đường đến điểm đón (trip status `confirmed`) và vị trí GPS
hiện tại còn cách điểm đón ~1km, hệ thống tự động gọi điện cho khách hàng (qua
kênh gọi nền có sẵn — `callService.startCustomerCall` mode `background`) để
nhắc: *"Tài xế sắp đến điểm đón, vui lòng ra cổng hoặc đường lớn để tài xế dễ
đón bạn nhé."*

Trước tính năng này, hệ thống hoàn toàn không track vị trí tài xế, không lưu
tọa độ điểm đón, và luồng gọi nền tuy đã tồn tại nhưng chỉ nói câu cố định
(không truyền được message tùy biến từ nơi khác gọi tới).

## Quyết định kiến trúc quan trọng

- **Tracking chạy nền (background)**, kể cả khi tắt màn hình / chuyển sang app
  bản đồ khác — chọn theo yêu cầu người dùng vì tài xế thực tế thường mở app
  bản đồ thật (Google/Goong Maps) để chạy chỉ đường, driver-app sẽ bị đẩy
  xuống nền. Dùng `expo-location` + `expo-task-manager`
  (`Location.startLocationUpdatesAsync` + `TaskManager.defineTask`), **không**
  tái dùng `@supersami/rn-foreground-service` sẵn có (dùng cho wake-word) —
  `expo-location` có cơ chế foreground-service riêng, tách biệt 2 mối quan tâm
  không liên quan.
- **Tọa độ điểm đón lấy miễn phí từ response Directions API đã gọi sẵn**
  (`leg.start_location`), không cần thêm API call geocode riêng — cả
  Google lẫn Goong đều trả field này (Goong dùng chung format response với
  Google).
- **Vị trí tài xế lưu Redis (TTL ngắn), tọa độ pickup lưu DynamoDB (field
  optional trên `Trip`)** — vị trí sống là dữ liệu tần suất cao, phù hợp cache
  ephemeral; tọa độ pickup cố định theo trip, hợp lý nằm trong record durable.
- **Dedupe qua Redis flag `trip:proximity_notified:<tripId>`** (set TRƯỚC khi
  dial, không phải sau) — tránh 2 ping GPS gần như đồng thời cùng vượt qua
  check và gọi trùng lặp.
- **`customMessage` là optional param mới, xuyên suốt cả chain** (`callService
  .startCustomerCall` → room metadata → `session.py` → `CustomerCallAgent`) —
  rỗng thì hành vi y hệt trước đây. `CustomerCallAgent`/`build_customer_call_
  prompt` **đã hỗ trợ sẵn** tham số này (dùng bởi `contact_call.py` cho tính
  năng gọi danh bạ), chỉ thiếu chỗ forward — không phải logic AI mới.

## Các file đã thêm/sửa

**Frontend (`driver-app`):**
- `package.json` — thêm `expo-location` (~19.0.8), `expo-task-manager` (~14.0.9)
- `app.json` — thêm plugin `expo-location` (quyền foreground + background,
  `isAndroidForegroundServiceEnabled`)
- `src/features/dashboard/services/locationTracking.ts` (mới) — permission
  flow (foreground → background), `TaskManager.defineTask`,
  `startTracking(tripId)`/`stopTracking()`, `setLocationUpdateHandler()`

**Backend (`trip-service`):**
- `src/cache/redis.ts` — thêm `driverLocationKey()`, `tripProximityNotifiedKey()`
- `src/routes/trips.ts` — route mới `POST /:tripId/location` (nhận GPS tài
  xế, lưu Redis, gọi `maybeNotifyCustomerOfProximity`)
- `src/services/maps/types.ts`, `google.ts`, `goong.ts` — `RouteInfo` thêm
  `pickup_lat`/`pickup_lng`, parse từ `leg.start_location` response
  Directions (Goong fallback về tọa độ đã geocode nếu response thiếu field)
- `src/services/tripService.ts` — `Trip` thêm field optional
  `pickup_lat`/`pickup_lng`
- `src/utils/geo.ts` (mới) — `distanceMeters()` (Haversine)
- `src/config.ts` — `proximityAlertMeters` (env `PROXIMITY_ALERT_METERS`,
  default 1000m)
- `src/services/callService.ts` — `startCustomerCall` thêm opt
  `customMessage`, forward vào `baseMeta.custom_message`
- `src/routes/calls.ts` — `POST /start` đọc thêm `customMessage` từ body

**Backend (`voice-agent`):**
- `app/agent/session.py` — nhánh `mode == "custcall"`: đọc
  `custom_message` từ room metadata vào `trip` dict, forward vào
  `CustomerCallAgent(...)`

## Đã test thật (backend/voice-agent)

- [x] `POST /:tripId/location`: tài xế đúng chuyến → 200; tài xế khác chuyến
  → 403; body sai kiểu → 400
- [x] Tạo trip thật qua Goong → `pickup_lat/lng` trả về đúng vị trí (đối
  chiếu tay, sai lệch chấp nhận được của geocode theo địa chỉ text)
- [x] Vị trí tài xế xa pickup (>1000m) → không kích hoạt gọi
- [x] Vị trí tài xế gần pickup (~290m) → **gọi thật thành công** qua Twilio
  verified number, tạo phòng LiveKit `custcall-*`, `call_id` trả về đúng qua
  `GET /api/v1/calls/latest`
- [x] Ping gần lần 2 → **không** tạo cuộc gọi mới (cùng `call_id`) — dedupe
  đúng

## Việc chưa xong / rủi ro cần test thật

- [ ] **Chưa test `locationTracking.ts` trên thiết bị thật** — không chạy
  được simulator trong môi trường phát triển hiện tại. Cần xác nhận: hộp
  thoại xin quyền hiện đúng (foreground rồi background), tọa độ cập nhật
  định kỳ, và tiếp tục chạy khi tắt màn hình / chuyển app khác (background
  location yêu cầu **dev build**, không chạy được qua Expo Go).
- [x] Đã nối `locationTracking.ts` vào vòng đời trip (`useProximityTracking`
  hook, `dashboard.tsx` — start khi có trip `confirmed`, stop khi rời khỏi)
  và nối `tripsService.updateLocation()` gọi `POST /:tripId/location`.
  **Chưa test được trên thiết bị thật** (cùng hạn chế môi trường dev như
  mục trên) — cần xác nhận ping thực sự tới backend và dừng đúng lúc.
- [ ] **iOS background location** ("Always" permission) bị Apple review
  khắt khe — có thể cần justification screen riêng trong app, hoặc làm
  Android trước nếu vướng App Store.
- [ ] Chưa nghe xác nhận bằng tai thật nội dung AI đọc trong cuộc gọi test
  (đã dial thành công, đang chờ người dùng xác nhận qua điện thoại).
- [ ] Ngưỡng 1000m và tần suất ping (15s/50m, xem `locationTracking.ts`) là
  giá trị khởi điểm, cần tinh chỉnh sau khi test thực tế nhiều chuyến.

## Ghi chú

Toàn bộ thay đổi additive/optional theo đúng nguyên tắc "không phá vỡ chức
năng cũ": field mới trên `Trip` optional (DynamoDB schema-less), route mới
không sửa route cũ, `customMessage`/`custom_message` mặc định rỗng giữ hành
vi hiện tại 100% khi không truyền.

## Cập nhật 2026-08-07 — Track 10 phút/mọi lúc online, hỏi tài xế trước khi gọi, gợi ý điểm dừng tiếp theo

Mở rộng theo yêu cầu người dùng, gồm 3 phần (plan chi tiết:
`C:\Users\Admin\.claude\plans\peaceful-floating-eich.md`, máy cục bộ, không nằm
trong repo):

1. **Đổi tần suất/điều kiện tracking**: từ 15s/50m chỉ khi có 1 trip
   `confirmed`/`picked_up` → **10 phút/lần, chạy suốt lúc tài xế online** (kể
   cả chưa nhận chuyến nào). Endpoint mới `POST /drivers/me/location` (không
   gắn `tripId`) — endpoint cũ `POST /:tripId/location` **giữ nguyên, không
   xoá** (xác nhận là dead cache, không ai đọc lại, nên an toàn để song song).
2. **Tính năng gọi báo khách 1km đổi từ tự động → hỏi tài xế trước**: AI hỏi
   "sắp đến điểm đón/trả khách X, có muốn tôi gọi báo không?" — nếu tài xế
   đang có phiên voice mở thì hỏi ngay trong phiên. Nếu không có phiên nào mở,
   **KHÔNG gọi điện tài xế** (đã bỏ hẳn nhánh SIP dial theo yêu cầu người
   dùng — "không muốn gọi điện cho tài xế nữa") — thay vào đó lưu lại thành
   "nudge đang chờ" (Redis, TTL 30 phút), giao cho tài xế **ngay khi họ tự mở
   app lần sau** (bấm orb như bình thường) thay vì lời chào mặc định. Đồng ý
   → gọi `call_customer(mode="agent")` sẵn có (tự ghi log DynamoDB + tóm tắt,
   không code lại). **Nằm sau feature flag `ENABLE_PROXIMITY_ASK` (mặc định
   `false`)** — tắt thì hành vi y hệt bản gốc phía trên (gọi thẳng khách).
   ⚠️ Đánh đổi: nếu tài xế không mở app trong vòng 30 phút, nudge bị bỏ qua
   (im lặng) — không có cơ chế chủ động báo tài xế biết có thông báo đang chờ
   (cần push notification thật mới làm được, xem mục dưới).
3. **Tool `suggest_next_stop` mới**: gợi ý tài xế nên đón/trả khách nào tiếp
   theo dựa trên vị trí hiện tại + toàn bộ lịch trình (so khoảng cách
   Haversine, chọn điểm gần nhất) — dùng được cả khi tài xế chủ động hỏi lẫn
   tự động nhắc ngay sau khi vừa đón (`picked_up`)/trả khách xong
   (`completed`), bất kể qua voice hay bấm nút trong app (cùng đi qua
   `PATCH /:tripId`). **Nằm sau feature flag `ENABLE_NEXT_STOP_NUDGE` (mặc
   định `false`)**.

4. **Auto-connect khi có nudge đang chờ** (cùng ngày, sau khi hỏi lại người
   dùng): ban đầu mục 2/3 khi không có phiên mở thì lưu "pending nudge" và
   CHỜ tài xế tự bấm orb — nhưng như vậy tài xế phải biết mà tự mở app, dễ bỏ
   lỡ. Đổi thành: `/drivers/me/context` trả thêm `has_pending_nudge: boolean`
   (đọc `driver:pending_nudge:<phone>`), driver-app poll field này (đã có
   sẵn poll 5s qua `useDriverContext`) và **tự động** gọi
   `useVoiceSessionStore.connect(phone, { silent: true })` — y hệt hành động
   tài xế tự bấm orb, không phải cơ chế mới — ngay khi thấy `true` và chưa
   có phiên nào khác đang chạy (`status === 'idle'`). **Chỉ tự connect khi
   có nudge đang chờ**, không tự connect vô điều kiện chỉ vì app đang mở/
   foreground.
   - `{ silent: true }` (theo yêu cầu người dùng): bỏ qua hẳn audio cue
     "đang kết nối..." + khoảng trễ 2.8-6.2s trước khi connect thật vốn có
     khi tài xế tự bấm orb (`connectingCueIndex`/`CONNECTING_CUE_DURATIONS_MS`
     trong `voiceSessionStore.ts`) — auto-connect không phải do tài xế bấm
     nên không cần âm thanh "chờ" đó, connect ngay để AI thông báo nudge cho
     tài xế càng nhanh càng tốt. Không đổi gì hành vi connect thường (tài xế
     tự bấm orb/wake-word vẫn có cue như cũ).

### Quyết định kiến trúc quan trọng (phần mở rộng)

- **Rủi ro lớn nhất đã xác minh trực tiếp trong code**: `DriverAgent.__init__`
  (`app/voicebot/{vn,en}/agent.py`) chỉ cần thấy field `trip_id` trong room
  metadata là chuyển hẳn sang chế độ "có chuyến mới" (chỉ 2 tool
  confirm_trip/reject_trip). Mọi phiên mở ra cho mục đích hỏi-báo-khách/gợi-ý
  **tuyệt đối không dùng `trip_id`** trong metadata — dùng field riêng
  `nudge_kind`/`related_trip_id`. Đã viết test trực tiếp construct
  `DriverAgent` với 3 trường hợp (inbound thường / có nudge / có trip thật)
  để xác nhận không lẫn lộn — xem lịch sử chat, không có script test riêng
  trong repo.
- **`reachDriver(driverPhone, kind, payload)` dùng chung** (mới,
  `trip-service/src/services/driverReachService.ts`) cho cả 2 tính năng 2 và
  3: có phiên đang mở (đọc Redis key `driver:session:<phone>`, do voice-agent
  tự đăng ký lúc job bắt đầu/xoá lúc kết thúc) → `RoomServiceClient.sendData`
  thẳng vào room đó; không có/lỗi → lưu vào `driver:pending_nudge:<phone>`
  (Redis, TTL 30 phút) — **không** dial SIP nữa (bản đầu có gọi điện thật, đã
  bỏ theo yêu cầu người dùng). `POST /voice/token` (route tài xế gọi khi bấm
  orb mở app) đọc key này lúc tạo phòng mới: nếu có nudge đang chờ → tạo
  phòng kèm metadata `nudge_kind` (qua `RoomServiceClient.createRoom`, trước
  đây route này không set metadata gì) rồi xoá key; không có thì giữ nguyên
  hành vi cũ 100% (không gọi `createRoom` tường minh, để LiveKit tự tạo
  phòng rỗng khi participant đầu tiên join). `session.py`/`agent.py` không
  cần sửa gì thêm cho thay đổi này — code đọc `nudge_kind` từ metadata vốn
  đã tách biệt khỏi việc "phòng được tạo bằng cách nào" từ đầu.
- **2 feature flag mặc định tắt** (`ENABLE_PROXIMITY_ASK`,
  `ENABLE_NEXT_STOP_NUDGE`, đọc trong `config.ts`) — deploy xong code không
  đổi hành vi production ngay, bật riêng từng cái sau khi verify ở
  dev/staging. Tắt được tức thời bằng đổi env + restart, không cần revert
  code.
- **Nudge "điểm dừng tiếp theo" luôn refetch trực tiếp** dữ liệu tài xế mới
  nhất (`backend_api.get_driver_context`) trước khi tính, thay vì tin vào
  cache trong phiên — vì trigger có thể đến từ nút bấm trên app (phiên voice
  đang mở, nếu có, không hề biết trạng thái chuyến vừa đổi).

### File đã thêm/sửa (phần mở rộng)

**`trip-service`:** `src/config.ts` (2 flag mới) · `src/cache/redis.ts`
(`driverLiveLocationKey`, `driverSessionKey`) · `src/services/proximityService.ts`
(mới, tách từ `trips.ts`, rẽ nhánh theo `ENABLE_PROXIMITY_ASK`) ·
`src/services/driverReachService.ts` (mới) · `src/routes/drivers.ts`
(`POST /me/location`, `PUT`/`DELETE /me/session`) · `src/routes/trips.ts`
(nối nudge vào `PATCH /:tripId`) · `src/services/driverContextService.ts`
(`current_location` field mới).

**`voice-agent`:** `app/agent/session.py` (đăng ký/xoá session presence,
nhánh parse `nudge_kind`, listener `data_received` mới) ·
`app/voicebot/processors/nudge.py` (mới) ·
`app/voicebot/processors/next_stop.py` (mới) ·
`app/voicebot/processors/context_store.py` (`get_current_location`) ·
`app/voicebot/{vn,en}/agent.py` (`proactive_nudge` param, tool
`suggest_next_stop` thêm vào `_DRIVER_INBOUND_TOOLS`) ·
`app/voicebot/{vn,en}/tools/suggest_next_stop.py` (mới) ·
`app/voicebot/{vn,en}/tools_definition.py`, `tools_mapping.py` (schema +
hướng dẫn tool mới).

**`driver-app`:** `src/features/dashboard/services/locationTracking.ts` (bỏ
ràng buộc theo tripId, đổi 10 phút) ·
`src/features/dashboard/hooks/useProximityTracking.ts` (bật/tắt theo
`driver.status === 'online'` thay vì trip status) ·
`src/services/api/drivers.ts` (`updateLocation`) ·
`app/(app)/dashboard.tsx` (truyền `isOnline` vào hook).

**Sửa thêm sau khi bỏ nhánh gọi điện** (cùng ngày, theo yêu cầu người dùng):
`trip-service/src/cache/redis.ts` (`driverPendingNudgeKey`) ·
`trip-service/src/services/driverReachService.ts` (bỏ hẳn `openNudgeSession`/
SIP dial, thay bằng lưu pending nudge + `invalidateDriverContext`) ·
`trip-service/src/routes/voice.ts` (`POST /token` đọc + xoá pending nudge +
`invalidateDriverContext`, tạo phòng kèm metadata `nudge_kind` nếu có) ·
`trip-service/src/services/driverContextService.ts` (thêm field
`has_pending_nudge`).

**Sửa thêm cho auto-connect** (cùng ngày): `driver-app/src/types/driver.ts`
(`DriverContext` thêm `has_pending_nudge`, `current_location`) ·
`driver-app/src/features/home/hooks/useAutoConnectOnNudge.ts` (mới) ·
`driver-app/app/(app)/_layout.tsx` (mount hook cạnh `useDispatchSocket`, để
hoạt động bất kể tab nào đang mở) ·
`driver-app/src/features/home/stores/voiceSessionStore.ts` (`connect()` thêm
tham số `opts?: { silent?: boolean }` + state `silentConnect`, bỏ qua cue
audio/delay khi `true`) ·
`driver-app/src/features/home/components/AssistantChatPanel.tsx` (effect
phát cue audio bỏ qua khi `voice.silentConnect`).

### Đã tự kiểm tra (không cần hạ tầng LiveKit/SIP thật)

- [x] `tsc --noEmit` sạch cho `trip-service` và `driver-app` sau mỗi bước
- [x] `py_compile` sạch cho toàn bộ file Python đã sửa/thêm
- [x] `_parse_room` không đổi hành vi với cả 4 loại room cũ (test trực tiếp)
- [x] `DriverAgent` construct với nudge → dùng đúng bộ tool inbound đầy đủ;
  construct với `trip_id` thật (dispatch chuyến mới) → vẫn đúng bộ tool
  outbound 2 cái như cũ, không bị ảnh hưởng bởi thay đổi
- [x] `build_nudge_message`/`build_next_stop_suggestion` test bằng dữ liệu
  giả — chọn đúng điểm gần nhất theo Haversine, xử lý đúng trường hợp chưa có
  GPS fix / không có ứng viên nào

### Chưa test (cần môi trường thật có LiveKit/SIP credentials)

- [ ] `sendData` thực sự đẩy được nudge vào phiên tài xế đang mở sẵn (Case A)
- [ ] Pending nudge lưu đúng khi không có phiên mở (Case B) — không gọi điện
  nữa; app tự động (`useAutoConnectOnNudge`, poll 5s qua `useDriverContext`)
  kết nối và tài xế nghe đúng câu nudge làm lời chào mở đầu, thay vì lời
  chào mặc định — **không cần tự bấm orb**; key `has_pending_nudge` phải
  chuyển về `false` sau khi giao (không tự connect lặp lại)
- [ ] Auto-connect KHÔNG được tự bấm khi tài xế đang có phiên khác đang chạy
  (`status !== 'idle'`) — verify không có 2 kết nối LiveKit chồng nhau
- [ ] Auto-connect (silent) KHÔNG phát audio cue "đang kết nối..." và connect
  gần như ngay lập tức (không có khoảng trễ 2.8-6.2s) — so sánh với connect
  thường (bấm orb tay) vẫn phải còn nguyên cue như cũ, không bị ảnh hưởng
- [ ] Pending nudge hết hạn sau 30 phút nếu tài xế không mở app trong lúc đó
  — xác nhận không có gì bất thường xảy ra (chỉ lặng lẽ hết hạn, app không
  bao giờ tự connect vì key đã hết hạn = coi như không có)
- [ ] Toàn bộ 5 bước theo đúng thứ tự "Thứ tự triển khai" trong file plan gốc
  (mỗi bước có mục Verify riêng) — nên bật `ENABLE_PROXIMITY_ASK`/
  `ENABLE_NEXT_STOP_NUDGE` ở dev/staging trước, KHÔNG bật thẳng production
- [ ] Frontend `locationTracking.ts`/`useProximityTracking.ts` bản mới trên
  thiết bị thật — cùng hạn chế môi trường dev như mục "Việc chưa xong" phía
  trên (cần dev build, không chạy qua Expo Go)
