# App Playbook — Hướng dẫn sử dụng ứng dụng

Tài liệu này dùng cho RAG (LlamaIndex). AI đọc nội dung này để trả lời câu hỏi về ứng dụng, cách dùng tính năng, và FAQ chung.

**Đối tượng:** Tài xế, Khách hàng, Quản trị viên  
**Ngôn ngữ:** Tiếng Việt

---

## 1. Tổng quan hệ thống

**AI-Powered Driver Assistant** là hệ thống xe công nghệ với trợ lý giọng nói AI hỗ trợ tài xế lái xe rảnh tay.

Hệ thống gồm:
- **Ứng dụng / web Tài xế** — nhận chuyến, xem lộ trình, nói chuyện với AI
- **Ứng dụng / web Khách hàng** — đặt xe, theo dõi chuyến, hỏi AI hỗ trợ
- **Bảng quản trị (Admin)** — tạo chuyến, quản lý tài xế, xem nhật ký cuộc gọi
- **Trợ lý giọng nói AI** — xử lý hội thoại qua LiveKit (trong app hoặc qua điện thoại)

Khách hàng có thể đặt xe bằng app/web **hoặc gọi số hotline** để AI hỗ trợ.

---

## 2. Ứng dụng hỗ trợ những gì?

### 2.1 Dành cho Tài xế

| Tính năng | Mô tả |
|-----------|--------|
| Đăng nhập bằng SĐT | Không cần mật khẩu phức tạp; số điện thoại là định danh |
| Bật / tắt nhận chuyến | Online để nhận chuyến, offline khi nghỉ |
| Xem chuyến sắp tới | Danh sách chuyến được gán |
| Nhận / từ chối chuyến mới | Qua app hoặc cuộc gọi AI thông báo |
| Cập nhật trạng thái chuyến | Đã đến điểm đón, đã đón khách, hoàn thành |
| Gọi khách hàng | AI gọi hộ và tóm tắt, hoặc kết nối trực tiếp |
| Xem điểm đón / ETA | Địa chỉ và thời gian ước tính |
| Trợ lý giọng nói | Nhấn nút mic, nói yêu cầu — AI thực hiện |
| Thu nhập & thống kê | Xem doanh thu hôm nay, điểm đánh giá (khi có dữ liệu) |
| Báo cáo sự cố | Khách vắng mặt, địa chỉ sai, vấn đề an toàn |

### 2.2 Dành cho Khách hàng

| Tính năng | Mô tả |
|-----------|--------|
| Đặt chuyến | Nhập điểm đón, điểm trả, giờ đón |
| Theo dõi trạng thái | Pending → confirmed → tài xế đang đến |
| Hủy chuyến | Hủy qua app hoặc hỏi AI hỗ trợ |
| Hỏi ETA | Còn bao lâu tài xế đến |
| AI hỗ trợ qua giọng nói | Hỏi trạng thái chuyến, hủy chuyến |

### 2.3 Dành cho Quản trị viên

| Tính năng | Mô tả |
|-----------|--------|
| Bảng chuyến đi | Xem tất cả chuyến theo trạng thái |
| Tạo chuyến thủ công | Gán tài xế, khách, địa chỉ |
| Quản lý tài xế | Danh sách, online/offline |
| Dispatch | Gửi thông báo / gọi tài xế nhận chuyến |
| Nhật ký cuộc gọi | Transcript và tóm tắt cuộc gọi AI |

---

## 3. Cách dùng Trợ lý giọng nói (Tài xế)

### 3.1 Bắt đầu

1. Mở app tài xế, đăng nhập bằng số điện thoại
2. Nhấn nút **Trợ lý AI** / biểu tượng mic
3. App kết nối LiveKit — AI chào: *"Xin chào! Tôi có thể giúp gì?"*
4. Nói yêu cầu bằng tiếng Việt, ngắn gọn

### 3.2 Ví dụ câu lệnh giọng nói

- *"Chuyến tiếp theo của tôi là gì?"*
- *"Khách đứng ở đâu?"*
- *"Gọi cho khách giúp tôi"* → AI hỏi: AI gọi hộ hay kết nối trực tiếp
- *"Tôi đến nơi rồi"* / *"Khách đã lên xe"* / *"Xong chuyến"*
- *"Hôm nay tôi kiếm được bao nhiêu?"*
- *"Khách không ra"* → báo vắng mặt
- *"Ứng dụng hỗ trợ những gì?"* → dùng cơ sở tri thức playbook

### 3.3 Gọi khách — hai chế độ

| Chế độ | Cách nói | AI làm gì |
|--------|----------|-----------|
| **AI nói** | *"Để AI gọi và tóm tắt"* | AI gọi khách, trò chuyện, tóm tắt lại cho tài xế |
| **Kết nối trực tiếp** | *"Kết nối cho tôi nói"* | Nối cuộc gọi, tài xế nói trực tiếp với khách |

### 3.4 Hủy chuyến bằng giọng nói

1. Nói: *"Tôi muốn hủy chuyến"*
2. AI hỏi xác nhận
3. Nói *"Có"* / *"Đồng ý"* để xác nhận hủy

---

## 4. Cách đặt xe (Khách hàng)

### 4.1 Qua app / web

1. Mở **customer-web** hoặc app khách
2. Nhập **điểm đón**, **điểm trả**, **giờ đón**
3. Nhấn **Đặt xe**
4. Màn hình hiển thị trạng thái: đang tìm tài xế → đã xác nhận

### 4.2 Qua điện thoại (AI)

1. Gọi số hotline dịch vụ
2. AI (CustomerAgent) hỏi: điểm đón, điểm trả, giờ, tên
3. AI tạo chuyến trong hệ thống
4. Thông báo: *"Đã đặt xe, tài xế sẽ nhận chuyến sớm"*

---

## 5. Luồng trạng thái chuyến đi

```
pending → notified → calling → confirmed → (đón khách) → completed
                              ↘ rejected / no_answer
```

| Trạng thái | Ý nghĩa |
|------------|---------|
| pending | Chuyến mới tạo, chưa gán tài xế |
| notified | Đã thông báo tài xế |
| calling | Đang gọi tài xế (SIP) |
| confirmed | Tài xế đã nhận |
| rejected | Tài xế từ chối |
| completed | Hoàn thành |

---

## 6. FAQ — Câu hỏi thường gặp

### 6.1 Chung về ứng dụng

**H: Ứng dụng hỗ trợ những gì?**  
T: Hỗ trợ đặt xe, theo dõi chuyến, trợ lý giọng nói cho tài xế và khách, quản trị chuyến qua admin panel.

**H: Cần internet không?**  
T: Có. App và trợ lý AI cần kết nối mạng (Wi‑Fi hoặc 4G/5G).

**H: AI có lưu cuộc gọi không?**  
T: Hệ thống có thể lưu tóm tắt hội thoại qua call-logger nếu dịch vụ được bật.

**H: Nói tiếng Việt được không?**  
T: Có. Trợ lý AI chính hỗ trợ tiếng Việt; một số cấu hình hỗ trợ tiếng Anh.

### 6.2 Tài xế

**H: Làm sao bật nhận chuyến?**  
T: Trong app chọn Online, hoặc nói với AI: *"Bật nhận chuyến"* / *"Tôi sẵn sàng"*.

**H: Làm sao xem chuyến tiếp theo?**  
T: Mở app xem danh sách, hoặc hỏi AI: *"Chuyến tiếp theo của tôi?"*

**H: Khách không ra thì làm gì?**  
T: Chờ thêm (gia hạn), gọi khách qua AI, hoặc báo khách vắng mặt qua trợ lý giọng nói.

**H: An toàn khi dùng giọng nói lúc lái xe?**  
T: AI trả lời ngắn, một việc một lúc. Với thao tác phức tạp nên dừng xe an toàn.

**H: AI có thay Google Maps không?**  
T: Không. AI cho biết địa chỉ đón/tóm tắt; chỉ đường chi tiết dùng Google Maps / Waze.

### 6.3 Khách hàng

**H: Làm sao biết tài xế còn bao lâu đến?**  
T: Xem trên app, hoặc hỏi AI: *"Còn bao lâu tài xế đến?"*

**H: Làm sao hủy chuyến?**  
T: Nút hủy trên app, hoặc nói với AI hỗ trợ — AI sẽ hỏi xác nhận trước khi hủy.

**H: Có cần tài khoản không?**  
T: Khách thường chỉ cần số điện thoại để định danh chuyến.

### 6.4 Kỹ thuật

**H: Tại sao AI không nghe / không trả lời?**  
T: Kiểm tra mic, quyền truy cập micro, kết nối mạng, và voice-agent đang chạy.

**H: Lỗi kết nối LiveKit?**  
T: Kiểm tra LIVEKIT_URL và token từ trip-service; thử đăng nhập lại app.

---

## 7. Điều AI playbook KHÔNG xử lý

- Tranh chấp thanh toán, hoàn tiền — liên hệ hotline
- Đổi thông tin đăng ký xe / bằng lái — cập nhật trong app mục Hồ sơ
- Tai nạn khẩn cấp — gọi 113/115 trước
- Chỉ đường từng mét — dùng app bản đồ

---

## 8. Liên hệ hỗ trợ

- Hotline: theo cấu hình TWILIO / số trên app
- Admin: dùng admin-panel để xem và xử lý chuyến

---

*Tài liệu playbook — cập nhật khi thêm tính năng. Sửa file trong `requirements/knowledge/vi/`, rồi chạy `python scripts/build_faq_index.py --lang vi`.*
