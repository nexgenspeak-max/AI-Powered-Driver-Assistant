# FEAT-M004 — Tự động gọi khách hàng khi tài xế gần điểm đón

| | |
|---|---|
| **Loại** | Feature |
| **Service** | driver-app, `trip-service`, `voice-agent` |
| **Ưu tiên** | 🟡 Trung bình |
| **Trạng thái** | 🔨 Toàn bộ đã code xong (FE+BE+voice-agent); backend/voice-agent đã test thật (gọi được, dedupe đúng); **frontend chờ test thiết bị thật** |
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
