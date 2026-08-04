# FEAT-M005 — ~~Tự động tìm & gán tài xế theo vị trí~~ → Khách tự chọn tài xế

| | |
|---|---|
| **Loại** | Feature |
| **Service** | driver-app, customer-app, `trip-service` |
| **Ưu tiên** | 🟡 Trung bình |
| **Trạng thái** | ❌ **Đã gỡ bỏ toàn bộ cơ chế auto-match theo vị trí** (quyết định người dùng) — thay bằng để khách hàng **tự chọn tài xế** từ danh sách đang online (`GET /drivers/online`), gửi thẳng `driver_phone` qua `POST /trips` (flow gán trực tiếp vốn có, không sửa gì). Hạ tầng WebSocket real-time (`notify/`) **được giữ lại** — giờ dùng cho cả lời mời chuyến (`trip_offer`) lẫn báo kết quả nhận/từ chối về khách (`trip_confirmed`/`trip_rejected`, mới thêm) |
| **Liên quan** | [01_BACKLOG.md](../01_BACKLOG.md), [FEAT-M004](FEAT-M004.md) (không bị ảnh hưởng — hoàn toàn tách biệt) |

## Vì sao gỡ bỏ

Người dùng quyết định: không cần hệ thống tự động tìm tài xế gần nhất/ghép
tuyến nữa. Khi đặt xe, khách hàng sẽ **tự xem danh sách tài xế đang online và
chọn người mình muốn đi** — đơn giản hơn, khách chủ động hơn, và bỏ được toàn
bộ độ phức tạp của geo-matching (Redis Geo, bearing heuristic, cascade
timeout theo từng ứng viên).

## Đã gỡ bỏ những gì

**Backend (`trip-service`) — xoá hẳn:**
- `src/services/matchDriverService.ts`, `dispatchOrchestrator.ts`,
  `dispatchTimer/` (toàn bộ thư mục), `handlers/dispatchTimeoutConsumer.ts`
- `POST /trips/auto-match`, `POST /trips/:tripId/retry-match` (2 route)
- Status `no_driver_found` khỏi `ALLOWED_STATUSES`/`CANCEL_RULES`
- `geoAddDriver()`/`geoSearchDrivers()`/`driverGeoKey()` khỏi `cache/redis.ts`
  (cả bản Redis thật lẫn fallback in-memory)
- `bearing()`/`bearingDiffDegrees()` khỏi `utils/geo.ts` (giữ lại
  `distanceMeters()` — vẫn dùng cho FEAT-M004's proximity-call)
- `POST /drivers/me/location` (idle GPS ping) và route debug
  `GET /drivers/online/locations` tôi thêm tạm để test trong phiên trước
- Config: `dispatchRadiusMeters`, `dispatchOfferTimeoutSeconds`,
  `ridePoolBearingDegrees`, `dispatchTimeoutQueueUrl`
- Hạ tầng AWS (`infra/trip-service/sam.yaml`): `DispatchTimeoutQueue` (SQS) +
  `DispatchTimeoutConsumerFunction` + policy/permission liên quan, route
  `AutoMatchTrip`, `DriverMeLocation`

**Backend — giữ lại (vẫn cần, không liên quan auto-match):**
- `services/notify/` (WebSocket local `ws` + API Gateway WebSocket khi
  deploy) — trước chỉ auto-match dùng, giờ **POST /trips** (gửi
  `trip_offer` khi tạo chuyến) và **PATCH /:tripId** (gửi `trip_confirmed`/
  `trip_rejected` khi tài xế nhận/từ chối — **mới thêm**) đều dùng
- `ConnectionsTable`, `DispatchWebSocketApi`, `ConnectFunction`/
  `DisconnectFunction` trong `sam.yaml` — vẫn cần cho WebSocket thật ở
  production
- `services/dispatchService.ts` (khác `dispatchOrchestrator.ts` đã xoá) —
  của `POST /:tripId/dispatch` (gọi điện voice-agent, không liên quan)

**Frontend (`driver-app`) — xoá hẳn:**
- `src/features/dashboard/services/idleLocationTracking.ts`,
  `hooks/useIdleLocationTracking.ts` (task GPS nền khi online, không có trip)
- `driversService.updateLocation()` khỏi `services/api/drivers.ts`
- Nhánh `no_driver_found` trong `useDispatchSocket.ts` (event này không còn
  bao giờ được gửi tới driver nữa)

**Frontend (`driver-app`) — giữ lại/chuyển vị trí:**
- `useDispatchSocket.ts` + `TripOfferBanner.tsx` (banner nổi "Chuyến mới!"
  + nút Nhận/Không nhận) — chuyển từ `dashboard.tsx` lên
  `app/(app)/_layout.tsx` để socket sống trên mọi tab, không chỉ Dashboard
- `TripCard.tsx`'s 2 nút Accept/Reject inline — không đổi gì

**Frontend (`customer-app`) — xoá:**
- Status `no_driver_found`, label/màu, UI banner "Đợi tiếp"/"Hủy chuyến"
  trong `TripStatusCard.tsx`, `tripsService.retryMatch()`

**Frontend (`customer-app`) — thêm mới:**
- `DriverPicker.tsx` (mới) — danh sách tài xế đang online (`GET
  /drivers/online`), khách chạm để chọn, bắt buộc phải chọn trước khi đặt —
  gắn vào cả 2 chế độ đặt xe (nhanh 4 ô lẫn chi tiết có tìm địa chỉ) trong
  `BookingLanding.tsx`
- `services/api/drivers.ts` (mới) — `driversService.listOnline()`
- `useCustomerDispatchSocket.ts` + `TripNotificationBanner.tsx` (mới) —
  WebSocket phía khách, lắng nghe `trip_confirmed`/`trip_rejected`, hiện
  banner nổi "Tài xế đã nhận/từ chối chuyến của bạn" trên mọi màn hình, gắn
  ở `app/_layout.tsx`

## Luồng mới (thay thế hoàn toàn auto-match)

1. Khách vào trang đặt xe → `DriverPicker` load `GET /drivers/online`, khách
   chạm chọn 1 tài xế.
2. Khách điền thông tin, bấm "Book Now" → `POST /trips` với `driver_phone`
   là số khách vừa chọn (route này **không đổi gì** so với trước — vẫn là
   flow gán trực tiếp cũ, giờ chỉ khác ở chỗ FE luôn truyền `driver_phone`
   tường minh thay vì để trống/dùng mặc định).
3. Backend gửi `trip_offer` qua WebSocket cho đúng tài xế đó (banner nổi +
   card trong list, có nút Nhận/Không nhận).
4. Tài xế bấm Nhận (`PATCH status=confirmed`) hoặc Không nhận
   (`status=rejected`) → backend gửi `trip_confirmed`/`trip_rejected` ngược
   lại đúng khách hàng qua WebSocket → banner hiện ngay trên customer-app.
5. Nếu bị từ chối, khách quay lại đặt xe, chọn tài xế khác — không có cơ
   chế tự động chuyển sang ứng viên tiếp theo nữa (đó chính là phần đã gỡ).

## Đã test thật (phiên này)

- [x] `no_driver_found`/`retry-match`/`AutoMatchTrip` không còn xuất hiện ở
  đâu trong code (`grep` sạch cả 3 service)
- [x] `tsc --noEmit` sạch cả `trip-service`, `driver-app`, `customer-app`
  sau khi gỡ
- [x] `POST /trips` với `driver_phone` tường minh vẫn tạo trip + gửi
  `trip_offer` qua WebSocket bình thường (không đổi hành vi so với trước)
- [ ] **Chưa test thật trên thiết bị**: `DriverPicker` chọn tài xế → đặt
  xe → tài xế nhận trên driver-app thật → khách thấy banner
  `trip_confirmed`/`trip_rejected` — cần người dùng tự bấm nhận/từ chối
  trên app thật để xác nhận đầu-cuối
- [ ] Chưa cập nhật/xoá `sam.yaml` trên môi trường AWS đã deploy (nếu có) —
  file source đã sửa, nhưng nếu `DispatchTimeoutQueue` từng được deploy
  thật, cần `sam deploy` lại để dọn tài nguyên AWS tương ứng, không tự động
  xảy ra chỉ vì sửa file yaml

## Ghi chú

Đây là lần hiếm hoi một tính năng bị **gỡ bỏ hoàn toàn** thay vì giữ lại
song song — khác với nguyên tắc "additive, không phá vỡ chức năng cũ" áp
dụng cho hầu hết các ticket khác trong repo này. Quyết định gỡ là của người
dùng, không phải do lỗi kỹ thuật của cách tiếp cận auto-match (thực ra đã
test local end-to-end thành công trước khi bị gỡ).
