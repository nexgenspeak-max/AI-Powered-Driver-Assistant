# FEAT-M005 — Tự động tìm & gán tài xế theo vị trí (nearest-idle + ride-pool)

| | |
|---|---|
| **Loại** | Feature |
| **Service** | driver-app, `trip-service` (+ hạ tầng AWS mới: SQS, API Gateway WebSocket) |
| **Ưu tiên** | 🟡 Trung bình |
| **Trạng thái** | 🔨 Backend + FE code xong, test local end-to-end thật (HTTP + WebSocket + timeout 15s) đầy đủ; hạ tầng Lambda (`sam.yaml`) đã validate qua CloudFormation API nhưng **chưa deploy/test trên AWS thật** |
| **Liên quan** | [01_BACKLOG.md](../01_BACKLOG.md), [FEAT-M004](FEAT-M004.md) (tính năng trước, dùng chung cơ chế GPS driver-app) |
| **Plan gốc** | `C:\Users\Admin\.claude\plans\merry-wobbling-nest.md` (máy Claude Code cục bộ, không nằm trong repo) |

## Mô tả

Khi có trip mới cần tìm tài xế theo vị trí (không chỉ định sẵn 1 SĐT cụ
thể), hệ thống tự động:

1. Tìm trong bán kính **5km** quanh điểm đón.
2. Ưu tiên **tài xế rảnh gần nhất** — thông báo, chờ **15 giây**, không nhận
   → tự chuyển tài xế rảnh kế tiếp.
3. Hết tài xế rảnh trong 5km → chuyển sang nhóm **tài xế đang bận nhưng đi
   cùng hướng** ("ghép tuyến" — không cần trùng khớp 1 tuyến đường, chỉ cần
   hướng đi tương đồng), cũng giới hạn 5km, cũng tuần tự 15 giây/người.
4. Hết cả 2 nhóm trong 5km mà không ai nhận → báo ngay cho khách "chưa tìm
   được tài xế", **không** tự nới bán kính.

## ⚠️ Nguyên tắc bắt buộc: đây là luồng đặt xe RIÊNG BIỆT

**`POST /trips` (luồng SĐT cụ thể — đặt xe chỉ định thẳng 1 tài xế) được giữ
nguyên 100%, không sửa gì cả.** Tính năng này là 1 route hoàn toàn mới:
**`POST /trips/auto-match`**. Đây là yêu cầu tường minh của người dùng —
không được gộp 2 nghiệp vụ vào cùng 1 chỗ, dù cả hai đều tạo ra 1 bản ghi
`Trip` giống hệt cấu trúc (cả hai đều gọi chung `tripService.create()`).

Vì lý do này, **toàn bộ tính năng gọi điện/dispatch/proximity-call
(FEAT-M004) không bị ảnh hưởng gì** — những tính năng đó chỉ thao tác trên 1
bản ghi Trip đã tồn tại, không quan tâm trip được tạo từ endpoint nào.

## Quyết định kiến trúc quan trọng

- **`trip-service` chạy Lambda ở production** (`infra/trip-service/sam.yaml`)
  → không thể dùng `setTimeout` in-process cho việc "chờ 15s rồi chuyển ứng
  viên" (Lambda không đảm bảo tiến trình nền sống sót giữa các lần gọi). Giải
  pháp: **SQS message với `DelaySeconds=15`**, 1 Lambda consumer riêng xử lý
  khi tin nhắn tới hạn.
- **Real-time push qua WebSocket** — dùng thư viện `ws` khi chạy local dev
  (gắn vào HTTP server có sẵn của `local.ts`), và **API Gateway WebSocket
  API** khi deploy Lambda thật (chuẩn AWS cho real-time trên serverless).
  Client (driver-app) dùng **chung 1 protocol** cho cả 2 môi trường: kết nối
  `wss://.../ws?role=driver&id=<phone>` — định danh qua query string ngay
  lúc connect, không cần gửi message đăng ký riêng.
- **2 điểm trên đều là 1 lớp abstraction chọn theo `config.env`** — giống hệt
  pattern `mapsService` (Google/Goong) đã làm ở tính năng trước. Code gọi
  `notifyDriver()`/`scheduleOfferTimeout()` ở mọi nơi khác không đổi gì khi
  đổi môi trường.
- **Vị trí tài xế gộp chung 1 Redis Geo set** (`drivers:geo`, key =
  `driver_phone`) — cả tài xế rảnh (ping mới `POST /drivers/me/location`,
  30-60s/lần) lẫn tài xế đang chở khách (ping có sẵn từ FEAT-M004,
  `POST /trips/:tripId/location`, 15s/lần — nay ping thêm vào set này) đều
  cùng 1 nơi tra cứu, `matchDriverService` chỉ cần 1 lần `GEOSEARCH`.
- **Ghép tuyến dùng heuristic hướng đi (bearing), không so khớp polyline
  thật** — rẻ, đơn giản, đúng theo yêu cầu "không cần đúng 1 tuyến, xa/gần
  hơn cũng được". Ngưỡng lệch góc mặc định 40° (`RIDE_POOL_BEARING_DEGREES`).
- **2 nhóm ứng viên xếp tuần tự, không trộn điểm số** — toàn bộ nhóm rảnh
  (gần nhất trước) rồi mới tới toàn bộ nhóm ghép tuyến (gần nhất trước).
  Cả 2 nhóm cùng giới hạn bán kính 5km, hết trong 5km thì báo lỗi ngay,
  không tự nới bán kính (quyết định của người dùng).

## Các file đã thêm/sửa

**Backend (`trip-service`):**
- `src/utils/geo.ts` — thêm `bearing()`, `bearingDiffDegrees()`
- `src/cache/redis.ts` — thêm `geoAddDriver()`/`geoSearchDrivers()` (Redis
  Geo thật qua `GEOADD`/`GEOSEARCH ... WITHCOORD WITHDIST`, + fallback
  in-memory tự viết cho local dev không có Redis)
- `src/services/maps/{types,google,goong}.ts`, `tripService.ts` — thêm
  `dropoff_lat/lng` (giống `pickup_lat/lng` ở FEAT-M004, miễn phí từ response
  Directions `leg.end_location`)
- `src/services/matchDriverService.ts` (mới) — `matchDrivers(pickup,
  excludePhones)`: GEOSEARCH 5km → phân loại rảnh/ghép tuyến qua GSI
  `driver_phone-created_at-index` có sẵn trên bảng Trips → xếp hạng
- `src/services/notify/{types,local,lambda,index}.ts` (mới) — WebSocket
  abstraction
- `src/services/dispatchTimer/{local,lambda,index}.ts` (mới) — hẹn giờ 15s
  abstraction (`setTimeout` local / SQS delay Lambda)
- `src/services/dispatchOrchestrator.ts` (mới) — `startAutoMatch`,
  `handleOfferTimeout`, `cancelPendingOffer`
- `src/routes/trips.ts` — route **mới** `POST /trips/auto-match` (không sửa
  `POST /trips`); `PATCH /:tripId` gọi `cancelPendingOffer` khi accept; thêm
  status `no_driver_found` vào `ALLOWED_STATUSES`
- `src/routes/drivers.ts` — route mới `POST /drivers/me/location`
- `src/config.ts` — `dispatchRadiusMeters`, `dispatchOfferTimeoutSeconds`,
  `ridePoolBearingDegrees`, `connectionsTable`, `websocketApiEndpoint`,
  `dispatchTimeoutQueueUrl`
- `src/handlers/{websocketConnect,websocketDisconnect,dispatchTimeoutConsumer}.ts`
  (mới) — 3 Lambda entry point riêng (không qua Express app chính)
- `src/local.ts` — gắn WebSocket server (`ws`) vào HTTP server có sẵn
- `infra/trip-service/sam.yaml` — thêm: bảng `ConnectionsTable` (DynamoDB,
  GSI `role_id-index`), `DispatchTimeoutQueue` (SQS), `DispatchWebSocketApi`
  (API Gateway WebSocket + routes `$connect`/`$disconnect`), 3 Lambda
  function mới, route REST mới cho `auto-match` + `drivers/me/location` +
  (tiện thể vá luôn 2 route `trips/{id}/location` bị thiếu từ FEAT-M004,
  chưa từng khai báo trong `sam.yaml`), tham số `RedisUrl`/`MapsProvider`/
  `MapsApiKey` mới (2 cái sau vá luôn gap thiếu từ tính năng Goong trước đó)

**Frontend (`driver-app`):**
- `src/features/dashboard/services/idleLocationTracking.ts` (mới) — task
  nền GPS riêng (tên task khác `locationTracking.ts`), 45s/100m, chạy khi
  tài xế bật "Online" bất kể có trip hay không
- `src/features/dashboard/hooks/useIdleLocationTracking.ts`,
  `useDispatchSocket.ts` (mới)
- `src/features/dashboard/hooks/useProximityTracking.ts` — mở rộng track
  sang cả status `picked_up` (không chỉ `confirmed`), cần cho ghép tuyến biết
  vị trí + hướng đi của tài xế đang chở khách
- `src/services/api/drivers.ts` — thêm `updateLocation()`
- `app/(app)/dashboard.tsx` — nối 2 hook mới (đặt trước early return
  `if (!driver) return null`, đúng Rules of Hooks)

## Đã test thật (local, không chỉ tsc)

- [x] `matchDrivers()`: tài xế rảnh gần nhất đứng đầu, tài xế ghép tuyến
  đúng hướng xếp sau, loại đúng người ngoài bán kính/lệch hướng quá ngưỡng
  (script gọi thẳng hàm, dữ liệu giả lập)
- [x] `POST /drivers/me/location`: ping thành công, thiếu header 400 đúng
- [x] **Toàn luồng end-to-end qua HTTP + WebSocket thật**: tạo trip qua
  `POST /trips/auto-match` (không truyền driver_phone) → gán đúng tài xế
  rảnh gần nhất → tài xế đó nhận `trip_offer` qua WebSocket **ngay lập tức**
  → không accept trong 15s → **tự động chuyển** sang ứng viên kế → ứng viên
  đó accept (`PATCH status=confirmed`) → dừng đúng người, timer cũ (đã hết
  tác dụng) trôi qua sau đó không làm gì cả
- [x] `POST /trips` (luồng cũ) tạo trip lại sau khi có auto-match — vẫn hoạt
  động y hệt trước, không bị ảnh hưởng
- [x] `sam.yaml`: `sam validate --lint` — chỉ 1 warning tiền-nhiệm
  (`nodejs20.x` deprecated, có từ trước, khớp đúng 4 lần = 4 Lambda function,
  không phát sinh thêm); `sam validate` (gọi CloudFormation API thật) —
  **valid**, không lỗi circular dependency/schema

## Việc chưa xong / rủi ro cần test thật

- [ ] **Chưa deploy/test trên AWS Lambda thật** — không thể làm trong môi
  trường này (cần tài khoản AWS thật, tốn phí, `sam deploy` chưa chạy). Cần
  tự deploy lên môi trường `dev` rồi lặp lại đúng kịch bản đã test local.
- [ ] **⚠️ Bắt buộc phải có Redis thật khi deploy** — nếu không set
  `RedisUrl` (param mới trong `sam.yaml`), tính năng này **sẽ không hoạt
  động đúng** trên Lambda (mỗi lần gọi hàm là 1 instance riêng, không chia
  sẻ bộ nhớ với "in-memory fallback" hiện tại). Gợi ý: dùng Redis serverless
  không cần VPC (ví dụ Upstash) để đơn giản hơn ElastiCache (cần VPC config
  thêm cho Lambda, chưa làm trong pass này).
- [ ] **Chưa test `idleLocationTracking.ts`/`useDispatchSocket.ts` trên
  thiết bị thật** — cùng hạn chế môi trường dev như FEAT-M004.
- [ ] **Ngưỡng bearing 40°, bán kính 5km, timeout 15s** là giá trị khởi
  điểm theo yêu cầu ban đầu — chưa tinh chỉnh bằng dữ liệu tài xế/chuyến đi
  thật.
- [ ] **`triedCandidates` (danh sách ứng viên đã thử/tripId) đang lưu
  in-memory trong `dispatchOrchestrator.ts`** — đúng cho `local.ts` (1
  process sống liên tục), nhưng **sẽ mất khi chuyển instance Lambda** ở
  production (một request/consumer có thể chạy trên Lambda instance khác
  instance đã lưu). Cần chuyển sang lưu bền vững (Redis hoặc field trên
  Trip) trước khi tin tưởng hoàn toàn ở production — ghi nhận rõ trong code
  nhưng **chưa sửa** trong pass này.
- [ ] Route `POST /trips/auto-match` chưa có UI/API method phía
  **customer-app** gọi tới (`tripsService.createAutoMatch()` — cần làm khi
  customer-app thực sự dùng luồng này để đặt xe).

## Ghi chú

Toàn bộ thay đổi additive theo đúng nguyên tắc "không phá vỡ chức năng cũ":
route mới không sửa route cũ, field mới optional, `POST /trips` (SĐT cụ thể)
và `POST /trips/auto-match` (theo vị trí) là 2 nghiệp vụ hoàn toàn tách biệt
theo yêu cầu tường minh của người dùng.
