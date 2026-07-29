"""
Vietnamese keyword-to-tool mapping prompt.
Included in the system instructions to help the LLM choose the right tool.
"""

TOOLS_MAPPING_PROMPT = """<KeywordsMappingForToolUsage>

## Tool: check_upcoming_trips
- Khi dùng: lịch chuyến, "chuyến tiếp theo", "còn mấy chuyến", "các chuyến còn lại đi đâu", "bao nhiêu tiền", "giá cước"
- Mặc định (không trip_index): liệt kê TẤT CẢ chuyến kèm giá ước tính
- trip_index=1,2,3…: chi tiết một chuyến — dùng khi tài xế nói "có", "chuyến thứ 2", "chuyến đó bao tiền"

## Tool: get_current_trip_info
- Khi dùng: "chuyến hiện tại", "chuyến đang chạy", "chuyến này bao nhiêu", giá/ETA chuyến active

## Tool: get_trip_traffic
- Khi dùng: "có tắc đường không", "kẹt xe không", "giao thông thế nào", "mất bao lâu", "đường có đông không"
- trip_index: chọn chuyến cụ thể (1, 2, 3…); bỏ trống = chuyến đang chạy / gần nhất
- KHÔNG bảo mở Maps nếu đã có traffic_note — chỉ gợi ý Maps khi tool trả về không có dữ liệu

---

## Tool: confirm_trip
- Khi dùng: tài xế ĐỒNG Ý NHẬN một chuyến chưa nhận (status pending/notified/calling)
- "có", "nhận", "đồng ý", "ok chuyến này", "tôi sẽ đi chuyến đó", "tôi xác nhận muốn chở chuyến đó"
- Áp dụng cả khi đang trong cuộc gọi thông báo chuyến mới LẪN khi tài xế hỏi assistant bình
  thường về một chuyến "notified" đang có trong lịch
- KHÔNG dùng update_trip_status cho việc này

## Tool: reject_trip
- Khi dùng: tài xế TỪ CHỐI một chuyến chưa nhận — "không", "từ chối", "bận", "bỏ qua chuyến đó"
- Chuyến ĐÃ nhận rồi mà muốn hủy → dùng request_cancel_trip, không phải tool này

---

## Tool: update_trip_status
- Khi dùng: tài xế thông báo TIẾN ĐỘ của chuyến ĐÃ NHẬN (đã confirmed) — không dùng để nhận chuyến mới
  - status=ARRIVED_PICKUP: "tôi đến nơi rồi", "đã đến điểm đón", "đang chờ khách"
  - status=PICKED_UP: "đã đón khách", "khách đã lên xe", "đón xong"
  - status=COMPLETED: "xong chuyến", "đã trả khách", "hoàn thành"

---

## Tool: call_customer
- Khi dùng: tài xế muốn liên hệ khách, "gọi cho khách", "liên lạc khách", "số điện thoại khách"
- Bắt buộc hỏi chế độ trước khi gọi tool:
  - mode=agent: AI tự nói chuyện → "để AI gọi", "AI nói giúp tôi", "tóm tắt lại"
  - mode=bridge: kết nối trực tiếp → "tôi tự nói", "kết nối trực tiếp", "nghe máy"

---

## Tool: call_custom_number → confirm_call_custom_number
- Khi dùng: tài xế muốn gọi một số điện thoại BẤT KỲ, KHÔNG phải số khách của chuyến hiện tại
  - "gọi giúp tôi số 09xx...", "gọi cho vợ tôi số...", "gọi tổng đài giúp tôi", "quay số này..."
- Số không cần thuộc chuyến nào cả — chỉ cần là số điện thoại Việt Nam hợp lệ
- LUÔN theo 2 bước, không được bỏ qua bước xác nhận (tránh nghe nhầm số qua giọng nói):
  1. call_custom_number(phone_number, contact_name?) → tool tự đọc lại số để tài xế xác nhận
  2. Tài xế xác nhận đúng ("đúng", "gọi đi", "ừ") → confirm_call_custom_number() mới thực sự gọi
  3. Nếu tài xế nói số bị đọc sai → gọi lại call_custom_number với số mới, KHÔNG tự sửa số
- Nếu số khách thuộc chuyến đang chạy → dùng call_customer, không dùng cặp tool này

---

## Tool: find_contact → (select_contact_match) → confirm_contact_call
- Khi dùng: tài xế muốn gọi một người TRONG DANH BẠ ĐIỆN THOẠI CỦA TÀI XẾ qua tên
  - "gọi cho Tuấn", "gọi giúp tôi anh Tuấn", "gọi cho vợ tôi" (nếu đã lưu tên trong danh bạ)
- Khác call_custom_number: đây là TÊN trong danh bạ trên điện thoại, không phải SỐ tài xế tự đọc
- LUÔN theo các bước:
  1. find_contact(contact_name) → tool tự tra danh bạ, đọc lại tên tìm được để xác nhận,
     hoặc hỏi chọn nếu có nhiều người trùng tên
  2. Nếu nhiều kết quả và tài xế nói rõ hơn → select_contact_match(selection)
  3. Tài xế xác nhận đúng người → HỎI CHẾ ĐỘ (giống call_customer):
     "Anh/chị muốn tôi tự gọi rồi tóm tắt lại, hay kết nối để anh/chị nói chuyện trực tiếp?"
     Nếu chọn AI tự gọi, hỏi thêm có muốn nhắn nội dung gì cụ thể không (điền vào message)
  4. confirm_contact_call(mode, message?) → thực hiện cuộc gọi thật
- Không tự đoán/tự gọi số khi chưa xác nhận đúng người qua tên
- Sau mode="agent" xong (tài xế xác nhận đã gọi xong) → summarize_last_call

---

## Tool: get_customer_location
- Khi dùng: "khách đứng ở đâu", "điểm đón ở đâu", "địa chỉ đón", "khách ở chỗ nào"

---

## Tool: confirm_trip_with_customer
- Khi dùng: "nhắn tin cho khách", "báo khách tôi đang đến", "xác nhận với khách", "gửi SMS"

---

## Tool: summarize_last_call
- Khi dùng: "cuộc gọi vừa rồi nói gì", "tóm tắt cuộc gọi", "khách vừa nói gì", "AI nói chuyện gì"

---

## Tool: create_reminder
- Khi dùng: "nhắc tôi trước X phút", "đặt nhắc nhở", "báo tôi trước giờ đón"

---

## Tool: request_cancel_trip
- Khi dùng: tài xế muốn hủy chuyến — LUÔN hỏi xác nhận, không hủy ngay
- "tôi muốn hủy", "không nhận chuyến này nữa", "hủy chuyến"

## Tool: confirm_cancel_trip
- Khi dùng: sau khi đã hỏi xác nhận và tài xế nói "có" / "đồng ý"

---

## Tool: get_today_earnings
- Khi dùng: "hôm nay kiếm được bao nhiêu", "thu nhập hôm nay", "doanh thu", "tôi được bao nhiêu tiền"

---

## Tool: get_driver_stats
- Khi dùng: "điểm của tôi", "rating bao nhiêu", "tỷ lệ chấp nhận", "thống kê tôi", "đánh giá"

---

## Tool: get_bonus_info
- Khi dùng: "có thưởng không", "vùng tăng giá", "khuyến mãi hôm nay", "bonus", "surge"

---

## Tool: report_customer_no_show
- Khi dùng: "khách không ra", "không thấy khách", "đợi mãi không thấy", "khách vắng mặt"
- LUÔN xác nhận với tài xế trước khi báo cáo

---

## Tool: report_trip_issue
- Khi dùng: "muốn báo cáo", "phản ánh vấn đề", "khách hành xử không tốt", "xe bị hỏng", "địa chỉ sai"
- issue_type: safety_concern | vehicle_damage | inappropriate_behavior | wrong_address | other

---

## Tool: extend_wait_time
- Khi dùng: "tôi cần chờ thêm", "gia hạn thời gian chờ", "cho tôi chờ thêm X phút"

---

## Tool: set_driver_status
- Khi dùng:
  - online=True: "bật nhận chuyến", "tôi sẵn sàng", "bật lại đi"
  - online=False: "tôi muốn nghỉ", "tắt nhận chuyến", "đi offline", "hết ca"

---

## Tool: answer_app_faq (playbook RAG)
- Khi dùng: câu hỏi về **ứng dụng / hướng dẫn / FAQ chung**, không cần dữ liệu chuyến realtime
  - "ứng dụng hỗ trợ những gì", "app có chức năng gì"
  - "cách đặt xe", "làm sao dùng trợ lý AI", "hướng dẫn sử dụng"
  - "cách thực hiện chức năng X", "FAQ", "playbook"
- Truyền `question` = câu hỏi gốc của người dùng
- KHÔNG dùng cho: trạng thái chuyến cụ thể → dùng trip tools

---

## Tool: end_conversation
- Khi dùng: tài xế chủ động muốn kết thúc cuộc gọi với trợ lý — "tạm biệt", "thôi tắt đi",
  "kết thúc trợ lý", "dừng lại nhé", "thế thôi nha", "vậy thôi cảm ơn"
- KHÔNG dùng khi tài xế chỉ đang im lặng tạm thời hoặc đang bận thao tác khác — chỉ gọi khi có
  ý định kết thúc rõ ràng bằng lời nói

---

## Tool: book_trip (customer agent)
- Khi dùng: khách muốn đặt xe, cần đi đâu đó, cần xe đón — "tôi muốn đặt xe", "đặt giúp tôi chuyến xe", "cần xe đi..."
- PHẢI hỏi đủ tên khách hàng, điểm đón, điểm đến trước khi gọi tool — không tự bịa thông tin còn thiếu
- PHẢI hỏi khách muốn đón NGAY BÂY GIỜ hay HẸN GIỜ khác (pickup_time)
- PHẢI đọc SỐ ĐIỆN THOẠI ĐÃ ĐĂNG KÝ cho khách nghe và hỏi dùng số này hay số khác (contact_phone)

## Tool: get_my_trip (customer agent)
- Khi dùng: "xe đến chưa", "chuyến tôi thế nào", "tài xế ở đâu", "còn bao lâu"

## Tool: request_cancel_my_trip (customer agent)
- Khi dùng: khách muốn hủy chuyến — LUÔN hỏi xác nhận, không hủy ngay
- "tôi muốn hủy chuyến", "hủy giúp tôi", "không đi nữa"

## Tool: confirm_cancel_my_trip (customer agent)
- Khi dùng: sau khi đã hỏi qua request_cancel_my_trip và khách nói "có" / "đồng ý"
- Sau khi hủy, chuyến không thể đổi trạng thái nữa — khách phải đặt chuyến mới nếu cần đi

## Tool: get_driver_eta (customer agent)
- Khi dùng: "còn bao lâu tài xế đến", "tài xế gần chưa", "bao nhiêu phút nữa"

## Tool: call_driver (customer agent)
- Khi dùng: khách muốn nói chuyện trực tiếp với tài xế — "cho tôi gặp tài xế", "kết nối với tài xế", "gọi tài xế giúp tôi", "tôi muốn dặn tài xế"
- TỰ kiểm tra trạng thái chuyến trước (dùng get_my_trip nếu chưa rõ) rồi quyết định gọi tool
  hay không — KHÔNG hỏi ngược khách "chuyến đã confirmed chưa", khách không biết điều đó
- Nếu status=confirmed → gọi call_driver luôn
- Nếu chưa confirmed → báo khách tài xế chưa nhận chuyến, mời chờ thêm (không gọi tool này)

</KeywordsMappingForToolUsage>
"""
