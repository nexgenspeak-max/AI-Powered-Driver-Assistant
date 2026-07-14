# 00 — Tổng quan dự án

> File này trả lời câu hỏi: **"Dự án này là gì, gồm những gì?"**
> Cập nhật khi kiến trúc tổng thể thay đổi (thêm/bỏ service, đổi stack chính). Không ghi chi tiết công việc hằng ngày ở đây — việc đó thuộc [`02_WORK_LOG.md`](02_WORK_LOG.md).

## Dự án là gì

Czen là hệ thống đặt xe (ride-hailing) có tích hợp **trợ lý giọng nói AI** (voicebot) cho cả tài xế lẫn khách hàng — tài xế/khách có thể nói chuyện trực tiếp với AI qua LiveKit để đặt chuyến, xác nhận, hủy chuyến, hoặc gọi cho bên còn lại mà không cần bấm nút thủ công.

## Kiến trúc hiện tại (cập nhật 2026-07-08)

> Lưu ý: các file cũ trong `claude/*.md` (working.md, plan.md...) mô tả một kiến trúc **Python/FastAPI/Lambda cũ đã bị thay thế** vào đầu tháng 7/2026. Bảng dưới đây phản ánh trạng thái thật của code tại thời điểm viết file này.

### Backend

| Service | Vai trò | Stack thực tế | Thư mục |
|---|---|---|---|
| `auth-service` | Đăng nhập/JWT, quản lý tài khoản admin/driver/customer, access+refresh token | TypeScript/Express | `src/backend/auth-service` |
| `trip-service` | CRUD chuyến đi, tài xế, tính route (Google Maps), phát token LiveKit, dispatch voice-agent | TypeScript/Express + DynamoDB | `src/backend/trip-service` |
| `call-center` | Webhook Twilio, gọi thoại vào/ra | TypeScript/Express | `src/backend/call-center` |
| `call-logger` | Lưu lịch sử cuộc gọi | TypeScript/Express (chưa deploy) | `src/backend/call-logger` |
| `voice-agent` | AI voicebot (DriverAgent + CustomerAgent) chạy trên LiveKit Cloud | Python (livekit-agents) — **vẫn giữ Python, không đổi sang TS** | `src/backend/voice-agent` |

### Frontend

| App | Vai trò | Stack | Thư mục | Ghi chú |
|---|---|---|---|---|
| `admin-panel` | Trang quản trị: trip board, quản lý tài xế/khách hàng, login, call logs | React + Vite + MUI v9 | `src/frontend/admin-panel` | |
| `customer-web` | Web app cho khách: đặt chuyến, gọi tài xế qua voicebot | React web | `src/frontend/customer-web` | Mới thêm 2026-07-07 |
| `driver-web` | Web app cho tài xế (PWA) | React web | `src/frontend/driver-web` | Mới thêm 2026-07-07 |
| `customer-app` | App mobile khách hàng (Expo Router) | React Native/Expo + NativeWind, Zustand, React Query | `src/frontend/customer-app` | App mobile chính thức, giữ song song với `customer-web` — xem [05_DECISIONS.md](05_DECISIONS.md) ngày 2026-07-14 |
| `driver-app` | App mobile tài xế (Expo Router) | React Native/Expo + NativeWind, Zustand, React Query | `src/frontend/driver-app` | App mobile chính thức, giữ song song với `driver-web`. Đang thiếu nhiều màn hình nghiệp vụ hơn `customer-app` (mới có `index`, `login`) |

> `src/frontend/mobile-app/customer-app` và `src/frontend/mobile-app/driver-app` (React Native bare, khởi tạo cùng lúc nhưng chưa từng được phát triển tiếp từ 2026-06-03) **không còn được dùng** — bị bỏ lại khi chuyển sang scaffold Expo Router ở trên. Chưa xóa khỏi repo, chỉ ngừng phát triển.

### Luồng chính

```
Khách/Tài xế mở app
        │  POST /api/v1/voice/(customer-)token
        ▼
   trip-service ──dispatch──▶ voice-agent (LiveKit Cloud, agent_name=driver-assistant)
        │                              │
        │                       DriverAgent / CustomerAgent
        │                       STT → LLM → TTS (SIP bridge nếu cần gọi người thật)
        ▼
     DynamoDB (trips, drivers)
```

Quy ước tên phòng LiveKit:

| Pattern | Ý nghĩa | Agent xử lý |
|---|---|---|
| `driver-{phone}-{ts}` | Tài xế mở app, nói chuyện với AI | `DriverAgent` |
| `customer-{phone}-{ts}` | Khách hàng dùng AI support | `CustomerAgent` |
| `trip-{id}` | AI gọi ra ngoài qua SIP (chủ động) | `DriverAgent` (đọc metadata) |

### Trạng thái chuyến đi (trip status)

Định nghĩa tại [`trips.ts`](../../src/backend/trip-service/src/routes/trips.ts) (`ALLOWED_STATUSES`/`CANCELLED_STATUSES`). Toàn bộ giá trị **viết thường**; `trip-service` tự lowercase mọi status nhận vào ở route `PATCH /:tripId` trước khi lưu, kể cả khi caller (voice-agent) gửi lên chưa đúng case.

| Status | Ý nghĩa | Ai/khi nào set |
|---|---|---|
| `pending` | Chuyến vừa tạo, chưa gán/thông báo tài xế | `trip-service` khi tạo trip |
| `notified` | Đã báo tài xế qua app/thông báo | `trip-service` ngay sau khi tạo |
| `calling` | Đang gọi tài xế qua voicebot | `dispatch` route |
| `confirmed` | Tài xế đã nhận chuyến | `confirm_trip` (voicebot) |
| `rejected` | Tài xế từ chối cuộc gọi thông báo ban đầu (chưa nhận) | `reject_trip` (voicebot) |
| `no_answer` | Tài xế không bắt máy khi được gọi thông báo | dispatch/call flow |
| `arrived_pickup` | Tài xế đã đến điểm đón, chờ khách | `update_trip_status` (voicebot, tài xế tự báo) |
| `picked_up` | Khách đã lên xe | `update_trip_status` (voicebot) |
| `completed` | Chuyến hoàn thành | `update_trip_status` (voicebot) |
| `cancelled` | Khách chủ động hủy chuyến | `cancel_my_trip`/`confirm_cancel_my_trip` (voicebot, phía khách) |
| `cancelled_by_driver` | Tài xế hủy **sau khi đã nhận** chuyến (`confirmed`) | `confirm_cancel_trip` (voicebot, phía tài xế) |
| `no_show` | Khách không xuất hiện tại điểm đón | `no-show` route |

Lưu ý:

- `rejected` (từ chối ban đầu) và `cancelled_by_driver` (hủy sau khi đã nhận) là **hai trường hợp khác nhau, cố ý tách riêng** để phân biệt trong dữ liệu/báo cáo — đừng gộp lại.
- `rejected`, `cancelled`, `cancelled_by_driver` là trạng thái **kết thúc** (`CANCELLED_STATUSES`): một khi trip vào 1 trong 3 trạng thái này thì không đổi status được nữa, phải đặt chuyến mới.

## Cách mở rộng file này

- Thêm service/app mới → thêm 1 dòng vào bảng tương ứng, không cần viết lại toàn bộ mô tả kiến trúc.
- Đổi stack của 1 service → cập nhật cột "Stack thực tế", ghi lại quyết định đổi stack vào [`05_DECISIONS.md`](05_DECISIONS.md).
- Nếu kiến trúc luồng chính thay đổi (thêm bước, thêm actor) → cập nhật sơ đồ ASCII phía trên.
