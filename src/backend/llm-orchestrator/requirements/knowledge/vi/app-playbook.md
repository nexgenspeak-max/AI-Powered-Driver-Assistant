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
3. App kết nối LiveKit — AI chào ngắn (Czen), sau đó hỏi *"Tôi có thể giúp gì cho bạn?"*
4. Nói yêu cầu bằng tiếng Việt, ngắn gọn — **một việc một lúc**

### 3.2 Ví dụ câu lệnh giọng nói

- *"Lịch trình hôm nay"* / *"Chuyến sắp tới"* → AI đếm chuyến; có thể hỏi tiếp *"Chuyến nào? Đón ai?"*
- *"Chuyến tiếp theo của tôi là gì?"*
- *"Khách đứng ở đâu?"* / *"Đón ở Lotte Liễu Giai"* — AI nhớ chuyến vừa nói
- *"Gọi cho khách giúp tôi"* / *"Báo khách tôi đang đến"* → AI gọi đúng khách của chuyến đang bàn
- *"Gọi cho NexGen Speak"* / *"Gọi khách chuyến 2"* — chọn chuyến theo tên, địa chỉ, giờ, hoặc số thứ tự
- *"Tôi đến nơi rồi"* / *"Khách đã lên xe"* / *"Xong chuyến"*
- *"Hôm nay tôi kiếm được bao nhiêu?"*
- *"Khách không ra"* → báo vắng mặt
- *"Ứng dụng hỗ trợ những gì?"* → dùng cơ sở tri thức playbook

### 3.3 Gọi khách — hai chế độ chính

| Chế độ | Cách nói | AI làm gì |
|--------|----------|-----------|
| **AI gọi hộ** (mặc định) | *"Gọi cho khách"*, *"Báo khách tôi sắp đến"* | AI gọi khách, nói thay tài xế, tài xế nghe live; kết thúc AI tóm tắt **một lần** |
| **Nói trực tiếp** | *"Kết nối cho tôi nói"* / *"Nói trực tiếp với khách"* | Nối cuộc gọi vào phòng; tài xế nói trực tiếp; nói *"trợ lý kết thúc"* khi xong |

Trước khi quay số, AI luôn nói *"Đang gọi [tên khách], xin đợi…"*.

### 3.4 Chọn đúng chuyến khi có nhiều chuyến

AI nhớ **chuyến đang bàn** (target trip) khi bạn hoặc AI vừa nhắc tên khách, địa chỉ đón, hoặc giờ hẹn. Ví dụ:

1. *"Lịch trình hôm nay"* → *"7 chuyến"*
2. *"Đón những ai?"* → AI nói chuyến 1: NexGen Speak, Lotte 54 Liễu Giai, 12:30
3. *"Gọi cho khách bảo tôi chuẩn bị đến"* → gọi đúng NexGen Speak, không hỏi lại danh sách

Bạn cũng có thể nói thẳng: *"Gọi khách ở Pasteur"*, *"Chuyến 12 giờ 30"*, *"Gọi Bob"*.

### 3.5 Xác nhận "Ok" / "Đúng rồi"

Khi AI hứa *"Em kiểm tra lịch"* hoặc *"Em nhắn khách…"* mà chưa làm ngay, bạn nói **Ok**, **Đúng rồi**, hoặc **Thì gọi đi** → AI thực hiện việc đó, không chỉ trả lời *"Vâng"*.

### 3.6 Sau cuộc gọi khách

Khi cuộc gọi kết thúc, AI đọc **một lần** tóm tắt (khách xác nhận gì, kết quả). Bạn có thể hỏi thêm: *"Tóm tắt cuộc gọi"* / *"Gọi xong chưa?"*.

### 3.7 Hủy chuyến bằng giọng nói

1. Nói: *"Tôi muốn hủy chuyến"*
2. AI hỏi xác nhận
3. Nói *"Có"* / *"Đồng ý"* để xác nhận hủy

### 3.8 Nhận chuyến, chỉ đường và các tính năng tự động

**Nhận chuyến mới.** Khi đang bật nhận chuyến, chuyến mới hiện thành bảng *Chuyến mới*: cước ước tính, quãng đường, thời gian, giờ đón, tên khách, ghi chú (hàng cồng kềnh, có trẻ em), điểm đón và điểm đến. Có 30 giây để chọn **Nhận chuyến** hoặc **Từ chối**; bấm **Để sau** (dấu X) thì chuyến vẫn nằm trong danh sách *Chờ* ở tab Chuyến. Trợ lý Czen cũng tự đọc chuyến mới và hỏi bạn có nhận không.

**Bật / tắt nhận chuyến.** Ở Trang chủ bấm **Bật nhận chuyến**, hoặc dùng công tắc ở đầu tab **Chuyến**.

**Chỉ đường ngay trong app.** Thẻ *Điểm dừng tiếp theo* ở Trang chủ cho biết đón/trả ai, ở đâu, còn bao xa. Bấm **Chỉ đường** để dẫn đường từng ngã rẽ ngay trong app (rẽ trái/phải trong bao nhiêu mét, còn bao nhiêu km và phút). Lệch đường thì app tự tính lại. Thứ tự các điểm đón/trả được sắp theo thời gian di chuyển nhanh nhất và tự cập nhật khi có chuyến mới.

**Tự động gọi nhắc khách khi gần điểm đón.** Vào *Cá nhân → Cài đặt trợ lý*, bật **Thông báo khách khi gần điểm đón** rồi chọn **Gọi nhắc khi còn cách**: 500 m, 1 km (mặc định), 2 km hoặc 3 km. Khi xe vào bán kính đó, AI tự gọi cho khách báo tài xế sắp tới để khách ra điểm đón. Khách không bắt máy thì AI gọi lại. Tài xế không cần thao tác gì.

**Đã đến điểm đón / Hoàn thành chuyến chỉ khi thực sự tới nơi.** App và trợ lý chỉ cho đánh dấu *Đã đến điểm đón* khi xe cách điểm đón khoảng 200 m trở xuống (chừa sai số bản đồ), và *Hoàn thành chuyến* khi cách điểm trả khoảng 200 m. Còn xa hơn thì app báo bạn còn cách bao nhiêu. Gọi cho khách thì được ở bất kỳ khoảng cách nào.

**AI hỏi lại khi chưa rõ bạn có muốn gọi khách không.** Nếu câu nói chưa rõ ý (ví dụ *"Hay là gọi khách nhỉ?"*), AI hỏi xác nhận trước khi quay số. Nói *"Gọi đi"* / *"Có"* để gọi, *"Thôi"* để bỏ. Lời hỏi xác nhận tự hết hạn sau khoảng 30 giây hoặc khi bạn chuyển sang chuyện khác.

**Chế độ rảnh tay.** Vào *Cài đặt trợ lý*, bật **Chế độ rảnh tay**. App nghe từ khoá đánh thức **"hey AI"** ở chế độ nền để mở trợ lý mà không cần chạm màn hình (hiện hỗ trợ trên Android).

**Tự gợi ý điểm dừng tiếp theo.** Bật trong *Cài đặt trợ lý*. Khi bạn còn cách điểm hiện tại dưới 200 m, trợ lý tự đề xuất điểm đón/trả kế tiếp.

**Các cài đặt khác.** *Ngôn ngữ trợ lý* (Tiếng Việt hoặc English, áp dụng từ lần kết nối sau) và *Cách gọi khách mặc định* (AI gọi hộ hoặc bạn nói trực tiếp). Cài đặt lưu trên tài khoản nên đổi máy vẫn giữ.

**Gõ thay vì nói.** Trong khung trò chuyện, bấm **Tắt micro, giữ kết nối** rồi gõ câu hỏi. Các nút gợi ý nhanh *Lịch hôm nay*, *Gọi khách*, *Thu nhập hôm nay*, *Nên đi đâu tiếp?* gửi câu hỏi chỉ với một chạm.

**Thu nhập.** Tab **Thu nhập** có Hôm nay / 7 ngày / 30 ngày, biểu đồ 7 ngày và lịch sử chuyến. Tab **Cá nhân** có đánh giá, tổng chuyến, tỉ lệ nhận và tỉ lệ hoàn thành.

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

**H: Làm sao xem thu nhập hôm nay / hôm qua / tuần / tháng?**  
T: Hỏi AI: *"Hôm nay kiếm bao nhiêu?"*, *"Hôm qua thu nhập?"*, *"Tuần này thu nhập?"*, *"Tuần trước kiếm được bao nhiêu?"*, *"Tháng này doanh thu?"*. "Tuần trước" là tuần lịch trước (thứ Hai đến Chủ nhật); "tuần này" và "tháng này" là 7 và 30 ngày gần đây. Chưa có tổng từ trước đến nay.

**H: Làm sao xem xe và biển số tôi đã đăng ký?**  
T: Hỏi AI: *"Xe tôi là gì?"* hoặc *"Biển số xe tôi?"*. AI đọc loại xe, biển số và tên xe trong hồ sơ; muốn sửa thì vào mục Hồ sơ trong ứng dụng.

**H: Hôm nay có thưởng hay ưu đãi gì không?**  
T: Hỏi AI: *"Hôm nay có thưởng không?"* hoặc *"Đang có ưu đãi gì?"*. AI đọc các khoản thưởng đang áp dụng kèm mức và thời hạn; không có thì AI nói không có.

**H: Làm sao biết tôi đang online hay offline?**  
T: Hỏi AI: *"Tôi đang online chưa?"*. Muốn đổi thì nói *"Bật nhận chuyến"* hoặc *"Tắt nhận chuyến"*.

**H: Xem chuyến hoàn thành hoặc bị hủy hôm nay / hôm qua / tuần này?**  
T: Hỏi *"Hôm nay hoàn thành mấy chuyến?"*, *"Hôm qua chạy được bao nhiêu chuyến?"*, *"Bảy ngày qua hoàn thành bao nhiêu chuyến?"* hoặc *"Có chuyến nào bị hủy không?"*. Con số 7 ngày chỉ tính các chuyến gần đây nhất mà ứng dụng đã tải.

**H: Ngày mai tôi có chuyến nào không?**  
T: Hỏi AI *"Ngày mai tôi có chuyến nào không?"*. AI đếm các chuyến đã đặt lịch đón vào ngày mai; chuyến không ghi giờ đón (đón đường, đi ngay) được tính là hôm nay.

**H: Làm sao bật nhận chuyến?**  
T: Trong app chọn Online, hoặc nói với AI: *"Bật nhận chuyến"* / *"Tôi sẵn sàng"*.

**H: Làm sao xem chuyến tiếp theo?**  
T: Mở app xem danh sách, hoặc hỏi AI: *"Lịch trình hôm nay"* / *"Chuyến sắp tới"*. Hỏi tiếp *"Đón ai?"* để nghe chi tiết từng chuyến.

**H: Làm sao gọi đúng khách khi có nhiều chuyến?**  
T: Nói tên khách (*"Gọi NexGen Speak"*), địa chỉ (*"Gọi khách ở Lotte Liễu Giai"*), giờ (*"Chuyến 12 giờ 30"*), hoặc số thứ tự (*"Gọi chuyến 2"*). Sau khi AI vừa đọc chi tiết một chuyến, bạn có thể nói *"Gọi cho khách"* — AI gọi đúng chuyến đó.

**H: AI hứa kiểm tra / gọi khách rồi im, tôi nói Ok thì sao?**  
T: Nói *"Ok"*, *"Đúng rồi"*, hoặc *"Thì gọi đi"* — AI sẽ thực hiện việc đã hứa, không chỉ trả lời vâng.

**H: Sau cuộc gọi AI có đọc tóm tắt không?**  
T: Có — một lần khi cuộc gọi kết thúc. Bạn cũng có thể hỏi *"Tóm tắt cuộc gọi"* hoặc *"Gọi xong chưa?"*.

**H: Khách không ra thì làm gì?**  
T: Chờ thêm (gia hạn), gọi khách qua AI, hoặc báo khách vắng mặt qua trợ lý giọng nói.

**H: An toàn khi dùng giọng nói lúc lái xe?**  
T: AI trả lời ngắn, một việc một lúc. Với thao tác phức tạp nên dừng xe an toàn.

**H: Có cần mở Google Maps để chỉ đường không?**  
T: Không cần. Bấm **Chỉ đường** trên thẻ điểm dừng tiếp theo để dẫn đường từng ngã rẽ ngay trong app. AI cũng trả lời được còn bao xa, mất bao lâu, đường có kẹt không.

**H: App có tự nhắc khách khi tôi sắp đến không?**  
T: Có. Bật *Thông báo khách khi gần điểm đón* trong *Cài đặt trợ lý* và chọn bán kính 500 m / 1 km / 2 km / 3 km. Xe vào bán kính đó thì AI tự gọi báo khách ra điểm đón.

**H: Sao tôi bấm "Đã đến điểm đón" không được?**  
T: App chỉ cho xác nhận khi bạn cách điểm đón khoảng 200 m trở xuống. Hãy đi tiếp tới gần điểm đón rồi bấm lại. Bạn vẫn có thể gọi khách ở bất kỳ khoảng cách nào.

**H: Làm sao bật chế độ rảnh tay?**  
T: *Cá nhân → Cài đặt trợ lý* → bật **Chế độ rảnh tay**, sau đó nói **"hey AI"** để gọi trợ lý mà không cần chạm màn hình (Android).

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
