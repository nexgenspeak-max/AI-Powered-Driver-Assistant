# Mobile App — User Flow

---

## 1. Hai chế độ (Dual Mode)

Cả **customer-app** và **driver-app** đều hỗ trợ 2 chế độ trên cùng một app:

| Chế độ | Kích hoạt | Mô tả |
|--------|-----------|-------|
| **Button Mode** | Mặc định khi mở app | Thao tác thủ công qua form, nút bấm |
| **Voice Mode** | Bấm nút 🎤 | Chuyển sang màn Digital Human — nói chuyện với AI |

---

## 2. Customer App Flow

### Button Mode

```
[Booking Screen]
  │
  ├── Điền form: tên, SĐT, điểm đón, điểm đến
  ├── Bấm "Request Driver" → POST /api/v1/trips
  │
  └── [Trip Status Screen]
        ├── Poll trạng thái mỗi 3s
        ├── pending → notified → calling → confirmed → completed
        └── Khi terminal → nút "Book Another Ride"
```

### Voice Mode

```
[Booking Screen]
  │
  └── Bấm 🎤  "Voice Mode"
        │
        └── [Digital Human Screen]
              ├── Avatar digital human (animated, lip-sync với TTS)
              ├── Kết nối LiveKit room ↔ voice-agent backend
              │
              ├── "Đặt xe từ 123 Lê Lợi đến sân bay"
              │     └── AI hiểu → book trip → xác nhận bằng giọng
              │
              ├── "Chuyến của tôi đến đâu rồi?"
              │     └── AI báo trạng thái realtime
              │
              ├── "Hủy chuyến"
              │     └── AI hỏi xác nhận → cancel
              │
              └── Bấm ✕ "End Session" → quay về Button Mode
```

---

## 3. Driver App Flow

### Button Mode

```
[Login Screen]
  └── Tên + SĐT → POST /api/v1/drivers

[Dashboard Screen]
  ├── Toggle Online/Offline
  ├── Poll trip list mỗi 3s
  │
  └── [Trip Card]
        ├── notified  → Accept / Reject
        ├── confirmed → Complete Trip
        └── Hiển thị: khách hàng, điểm đón/đến, ETA, km
```

### Voice Mode

```
[Dashboard Screen]
  │
  └── Bấm 🎤 (floating button góc dưới)
        │
        └── [Digital Human Screen]
              ├── Avatar + mic active
              ├── Kết nối LiveKit ↔ voice-agent
              │
              ├── "Có chuyến mới không?"
              │     └── AI đọc danh sách trip đang chờ
              │
              ├── "Nhận chuyến" / "Từ chối chuyến"
              │     └── AI → PATCH trip status
              │
              ├── "Hoàn thành chuyến"
              │     └── AI → PATCH status = completed
              │
              ├── "Offline đi" / "Online đi"
              │     └── AI → PATCH driver status
              │
              └── Hands-free — không cần chạm màn hình khi lái
```

---

## 4. Digital Human Screen — UI Layout

```
┌─────────────────────────────────┐
│                                 │
│        [Avatar / 3D Face]       │  ← lip-sync với TTS audio
│        speaking / listening     │
│                                 │
│   ───────────────────────────   │
│                                 │
│  👤 "Đặt xe từ Lê Lợi đến..."  │  ← transcript người dùng
│  🤖 "Được rồi, tôi sẽ đặt..."  │  ← transcript AI response
│                                 │
│     [~~~ waveform animation ~~~]│  ← khi đang nói
│                                 │
│   ───────────────────────────   │
│                                 │
│         [ ✕  End Session ]      │
│                                 │
└─────────────────────────────────┘
```

---

## 5. Kết nối Backend

| Action | Endpoint | Service |
|--------|----------|---------|
| Book trip (button) | `POST /api/v1/trips` | trip-service |
| Track trip | `GET /api/v1/trips/:id` | trip-service |
| Driver login | `POST /api/v1/drivers` | trip-service |
| Toggle status | `PATCH /api/v1/drivers/:phone` | trip-service |
| Voice session | LiveKit room | voice-agent (ECS) |
| AI book trip | voice-agent → `POST /api/v1/trips` | internal |
| Call transcript | `POST /api/v1/records` | call-logger |
| View call logs | `GET /api/v1/records` | call-logger |

---

## 6. Voice Agent — Intent List (Driver)

| Intent | Ví dụ câu nói | Action |
|--------|--------------|--------|
| `CHECK_UPCOMING_TRIPS` | "Có chuyến mới không?" | GET trips |
| `ACCEPT_TRIP` | "Nhận chuyến" | PATCH status = confirmed |
| `REJECT_TRIP` | "Từ chối chuyến" | PATCH status = rejected |
| `COMPLETE_TRIP` | "Hoàn thành chuyến" | PATCH status = completed |
| `CANCEL_TRIP` | "Hủy chuyến này" | PATCH status = cancelled (xác nhận trước) |
| `GO_ONLINE` | "Online đi" | PATCH driver status = online |
| `GO_OFFLINE` | "Offline đi" | PATCH driver status = offline |
| `CALL_CUSTOMER` | "Gọi cho khách" | trigger call service |
| `GET_CUSTOMER_LOCATION` | "Khách ở đâu?" | GET trip location |
| `UPDATE_STATUS_ARRIVED` | "Tôi đã đến điểm đón" | PATCH status = arrived |
| `SUMMARIZE_CALL` | "Tóm tắt cuộc gọi vừa rồi" | GET /api/v1/records/latest |
| `CREATE_REMINDER` | "Nhắc tôi trước 10 phút" | POST /reminders |

---

## 7. Voice Agent — Intent List (Customer)

| Intent | Ví dụ câu nói | Action |
|--------|--------------|--------|
| `BOOK_TRIP` | "Đặt xe từ A đến B" | POST /api/v1/trips |
| `CHECK_TRIP_STATUS` | "Chuyến của tôi đến đâu rồi?" | GET /api/v1/trips/:id |
| `CANCEL_TRIP` | "Hủy chuyến" | PATCH status = cancelled |
| `GET_DRIVER_INFO` | "Tài xế tên gì?" | GET trip → driver info |
| `BOOK_AGAIN` | "Đặt lại chuyến như cũ" | POST trip với địa chỉ cũ |

---

## 8. Quy tắc quan trọng

Với các hành động nguy hiểm, AI **phải hỏi xác nhận** trước khi thực hiện:

- Hủy chuyến
- Từ chối chuyến
- Gọi điện cho khách
- Offline khi đang có chuyến

---

## 9. Sprint Mapping

| Sprint | Nội dung |
|--------|----------|
| Sprint 2 ✅ | Button Mode hoàn chỉnh — customer-web + driver-web (PWA) |
| Sprint 3 ✅ | Voice-agent backend — LiveKit + GPT-4o + Twilio SIP |
| Sprint 4 🔄 | Admin panel — trip board, call logs, driver management |
| Sprint 5 | Mobile app Button Mode (customer-app + driver-app) |
| Sprint 5 | Digital Human Screen + LiveKit SDK tích hợp vào app |
| Sprint 5 | Avatar animation (Lottie / 3D lip-sync) |
| Sprint 6 | E2E Voice Mode test, production build, app store prep |

---

## 10. Scenarios chi tiết (Voice Agent)

### Scenario 1: Tài xế hỏi chuyến đi

> "Tôi có chuyến đi nào không?"

- Intent: `CHECK_UPCOMING_TRIPS`
- API: `GET /api/v1/trips?driver_phone=:phone`
- AI response: *"Anh có 1 chuyến lúc 9:30. Khách là anh AA, đón ở Quận 1, đến sân bay Tân Sơn Nhất."*

---

### Scenario 2: Tài xế nhận / từ chối chuyến

> "Nhận chuyến" / "Từ chối chuyến"

- Intent: `ACCEPT_TRIP` / `REJECT_TRIP`
- API: `PATCH /api/v1/trips/:id` → `{ status: "confirmed" | "rejected" }`
- AI hỏi xác nhận nếu reject
- AI response: *"Đã xác nhận chuyến đi. Khách đang được thông báo."*

---

### Scenario 3: Tài xế gọi cho khách

> "Gọi cho khách hàng AA giúp tôi"

- Intent: `CALL_CUSTOMER`
- AI xác nhận: *"Em sẽ gọi cho khách AA trong chuyến 9:30 nhé?"*
- API: `POST /calls/start` → trigger call service
- AI response: *"Đang kết nối cuộc gọi..."*

---

### Scenario 4: Hỏi vị trí khách

> "Khách đang ở đâu?"

- Intent: `GET_CUSTOMER_LOCATION`
- API: `GET /api/v1/trips/:id`
- AI response: *"Khách đang ở 12 Nguyễn Huệ, Quận 1. Anh có muốn mở bản đồ không?"*

---

### Scenario 5: Tóm tắt cuộc gọi

> "Tóm tắt cuộc gọi vừa rồi"

- Intent: `SUMMARIZE_CALL`
- API: `GET /api/v1/records?caller=:phone&limit=1`
- AI response: *"Cuộc gọi vừa rồi: khách xác nhận vẫn đi chuyến 9:30 và muốn đón ở cổng chính."*

---

### Scenario 6: Hủy chuyến (có xác nhận)

> "Hủy chuyến này"

- Intent: `CANCEL_TRIP`
- AI hỏi: *"Anh có chắc muốn hủy chuyến với khách AA không?"*
- Nếu xác nhận: `PATCH /api/v1/trips/:id` → `{ status: "cancelled" }`
- AI response: *"Đã hủy chuyến đi."*

---

### Scenario 7: Customer đặt xe bằng giọng

> "Đặt xe từ 123 Lê Lợi đến sân bay Tân Sơn Nhất"

- Intent: `BOOK_TRIP`
- AI extract: pickup = "123 Lê Lợi", dropoff = "sân bay Tân Sơn Nhất"
- AI xác nhận: *"Đặt xe từ 123 Lê Lợi đến sân bay Tân Sơn Nhất đúng không?"*
- API: `POST /api/v1/trips`
- AI response: *"Đã đặt xe thành công. Đang tìm tài xế gần nhất cho bạn."*
