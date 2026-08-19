"""
Vietnamese keyword-to-tool mapping prompt.
Included in the system instructions to help the LLM choose the right tool.
"""

TOOLS_MAPPING_PROMPT = """<KeywordsMappingForToolUsage>

## Tool: check_upcoming_trips
- Khi dùng: lịch chuyến, "kiểm tra chuyến đi", "chuyến tiếp theo", "còn mấy chuyến", "các chuyến còn lại đi đâu", "bao nhiêu tiền", "giá cước"
- BẮT BUỘC chọn scope — nếu câu hỏi MƠ HỒ (không rõ đang chạy, đang chờ xác nhận hay mới), PHẢI
  hỏi lại trước: "Anh/chị muốn xem chuyến đang chạy, chuyến đang chờ xác nhận, hay tất cả?" —
  KHÔNG tự đoán
  - scope="all": tài xế hỏi tổng quát "tôi đang có những chuyến nào", "chuyến đi thế nào", "hết",
    "tất cả", "cả hai" — hoặc đã chọn "tất cả" sau khi được hỏi lại
  - scope="in_progress": tài xế nói rõ "chuyến đang chạy", "chuyến hiện tại", "đang chở khách"
    KHÔNG phân biệt đã đón hay chưa — gồm cả chuyến đã xác nhận nhưng chưa tới điểm đón LẪN đã
    đón khách rồi. Nếu trong lúc trả lời phát hiện tài xế còn chuyến khác đang chờ xác nhận
    (notified/calling) → PHẢI báo luôn kèm theo, không đợi tài xế hỏi tiếp mới nói
  - scope="not_picked_up": tài xế hỏi rõ "tôi còn chuyến nào chưa đón", "chuyến nào chưa đón
    khách", "còn ai chưa lên xe" — chỉ chuyến đã nhận nhưng khách CHƯA lên xe
  - scope="picked_up": tài xế hỏi rõ "tôi đã đón những khách nào", "chuyến nào đã có khách trên
    xe", "đã đón ai rồi" — chỉ chuyến đã đón khách, đang trên đường trả khách
  - scope="awaiting_confirmation": tài xế nói rõ "chuyến mới", "chuyến sắp tới", "chuyến đang
    chờ xác nhận", "có ai đặt thêm không", "có thêm chuyến nào mới hay chưa xác nhận không"
  - scope="new": hiếm khi cần chủ động chọn — chỉ dùng khi cần tra chuyến vừa tạo, hệ thống
    chưa kịp gọi tài xế (không xuất hiện trong hội thoại thông thường)
- trip_index=1,2,3…: chi tiết một chuyến trong danh sách VỪA liệt kê — dùng khi tài xế nói
  "có", "chuyến thứ 2", "chuyến đó bao tiền" — gọi lại với ĐÚNG scope của lần liệt kê gần nhất

## Tool: refresh_latest_data
- Khi dùng: tài xế nói "có"/"lấy đi"/"được" ngay sau khi check_upcoming_trips HOẶC
  get_today_earnings kết thúc câu trả lời bằng "anh/chị có muốn em lấy dữ liệu mới nhất không?"
- KHÔNG tự ý gọi, và KHÔNG dùng cho tool nào khác — chỉ 2 tool trên hỏi câu này
- Nếu tài xế từ chối/im lặng/hỏi việc khác → KHÔNG gọi, cứ tiếp tục hội thoại bình thường

## Tool: get_current_trip_info
- Khi dùng: hỏi về ĐÚNG 1 chuyến cụ thể đang thực hiện — "chuyến hiện tại", "chuyến này bao nhiêu", giá/ETA chuyến active
- Khác check_upcoming_trips(scope="in_progress"): tool đó liệt kê TẤT CẢ chuyến đang chạy (có thể nhiều); tool này chỉ trả về 1 chuyến duy nhất. Nếu tài xế hỏi chung chung "kiểm tra/xem các chuyến đang chạy" (ngụ ý có thể nhiều) → dùng check_upcoming_trips
- KHÔNG dùng cho câu hỏi ngụ ý cần biết theo VỊ TRÍ/khoảng cách (vd "tôi đang đi đón/trả khách
  nào") — tool này KHÔNG xếp theo GPS, chỉ trả về 1 chuyến bất kỳ đang active. Câu hỏi kiểu đó
  → dùng suggest_next_stop

## Tool: suggest_next_stop
- Khi dùng: tài xế hỏi NÊN đi đâu tiếp theo, hoặc hỏi ĐANG đi đón/trả khách nào (ngụ ý cần xác
  định theo VỊ TRÍ GPS hiện tại, không phải chỉ liệt kê) — "tôi nên đi đâu tiếp", "giờ nên đón
  hay trả ai", "điểm dừng tiếp theo là gì", "nên làm gì tiếp theo", "tôi đang đi đón khách nào",
  "tôi đang trên đường đón ai", "khách tiếp theo tôi đón là ai" — tool tự xếp hạng theo khoảng
  cách từ vị trí GPS mới nhất của tài xế, không cần tham số
- Khác check_upcoming_trips: tool đó CHỈ liệt kê theo trạng thái (không xếp hạng vị trí); dùng
  suggest_next_stop khi tài xế cần một GỢI Ý cụ thể nên đi đâu / đang đi đâu, không phải chỉ
  xem danh sách

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
- NẾU tài xế đang có NHIỀU HƠN 1 chuyến chờ xác nhận: gọi tool này TRƯỚC không kèm trip_index —
  nó sẽ tự đọc lại danh sách và hỏi chuyến nào. Đọc lại câu hỏi đó cho tài xế, chờ họ chọn (số
  thứ tự hoặc tên khách), rồi gọi lại kèm đúng trip_index.
- Nếu chỉ có 1 chuyến chờ xác nhận, hoặc đang trong cuộc gọi outbound về đúng 1 chuyến, bỏ qua
  bước hỏi lại đó — không cần trip_index.
- KHÔNG dùng update_trip_status cho việc này

## Tool: reject_trip
- Khi dùng: tài xế TỪ CHỐI một chuyến chưa nhận — "không", "từ chối", "bận", "bỏ qua chuyến đó"
- Cách phân biệt nhiều chuyến giống hệt confirm_trip ở trên — gọi không kèm trip_index trước nếu
  có nhiều hơn 1 chuyến chờ xác nhận, rồi gọi lại kèm trip_index tài xế đã chọn.
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
- NẾU tài xế đang có NHIỀU HƠN 1 chuyến (đã nhận, đang thực hiện): gọi tool này TRƯỚC mà chưa
  cần biết trip_index — tool tự đọc ra danh sách các chuyến/khách và hỏi tài xế muốn gọi ai.
  Đọc lại nguyên văn câu đó cho tài xế, chờ tài xế chọn (nói số thứ tự hoặc tên khách), rồi mới
  gọi lại call_customer với đúng trip_index đó. KHÔNG tự đoán chuyến nào khi có nhiều hơn 1.
- Nếu tài xế chỉ có đúng 1 chuyến thì không cần hỏi chuyến nào, bỏ qua bước này.
- Bắt buộc hỏi chế độ trước khi gọi tool (áp dụng dù có 1 hay nhiều chuyến) — TRỪ trường hợp
  ngay bên dưới (đã hỏi và tài xế đồng ý thì gọi thẳng mode="agent", không hỏi lại chế độ):
  - mode=agent: AI tự nói chuyện → "để AI gọi", "AI nói giúp tôi", "tóm tắt lại"
  - mode=bridge: kết nối trực tiếp → "tôi tự nói", "kết nối trực tiếp", "nghe máy"
  - mode=background: AI gọi nền → "để AI gọi nền", "tôi đang bận", "gọi giúp rồi báo lại"

### Sau khi AI chủ động hỏi "có muốn tôi gọi báo khách không" (nudge sắp đến điểm đón/trả)
- Nếu tài xế đồng ý ("có", "gọi đi", "ừ") → gọi THẲNG `call_customer(mode="agent", message=...)`,
  KHÔNG hỏi lại chế độ (đã ngụ ý mode=agent — AI tự gọi và báo lại). BẮT BUỘC điền `message` với
  đúng nội dung cần truyền đạt — KHÔNG được gọi thiếu `message` trong tình huống này, nếu không
  AI sẽ chỉ nói chuyện chung chung với khách mà không nêu lý do gọi:
  - Nudge sắp đến ĐIỂM ĐÓN → message ví dụ: "Anh/chị ra điểm đón giúp tài xế nhé, tài xế sắp
    tới rồi."
  - Nudge sắp đến ĐIỂM TRẢ → message ví dụ: "Anh/chị chuẩn bị hành lý, tài xế sắp đến nơi rồi."
  - Sau khi AI đã nói xong nội dung này cho khách, mới tiếp tục trò chuyện bình thường với khách
    nếu khách hỏi thêm gì đó — không nói chuyện chung chung trước khi nêu lý do gọi.
  Nếu tài xế đang có nhiều hơn 1 chuyến và tool tự hỏi lại chuyến nào, dùng đúng tên khách/địa
  chỉ vừa nhắc trong câu hỏi nudge để chọn đúng chuyến khi trả lời tool, hoặc đọc lại câu hỏi cho
  tài xế nếu không chắc.
- Nếu tài xế từ chối/im lặng/nói không cần ("không", "thôi", "khỏi") → KHÔNG gọi customer, chỉ
  xác nhận ngắn gọn ("Dạ vâng") rồi tiếp tục hội thoại bình thường.

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
  3. Tài xế xác nhận đúng người → HỎI CHẾ ĐỘ (y hệt call_customer, đúng 3 lựa chọn):
     - mode=background: AI tự gọi người này ở phòng riêng; tài xế vẫn hỏi trợ lý việc khác;
       tóm tắt sau → "để AI gọi nền", "AI tự gọi rồi báo lại", "gọi giúp tôi, tôi đang bận"
     - mode=agent: AI gọi người này vào cùng phòng, tài xế nghe trực tiếp → "để AI gọi", "AI
       nói giúp tôi", "tóm tắt lại"
     - mode=bridge: kết nối trực tiếp, tài xế tự nói → "tôi tự nói", "kết nối trực tiếp", "nghe máy"
     - Nếu ngay trong câu trả lời chế độ, tài xế ĐÃ nói luôn nội dung muốn nhắn VÀ chọn
       mode=agent (vd: "gọi và bảo họ tôi đến trễ 10 phút", "bạn gọi rồi nói tôi bận không
       nghe máy được") → lấy ĐÚNG nguyên văn nội dung đó điền vào message — KHÔNG hỏi lại
       thêm một câu riêng "anh/chị có muốn nhắn gì không". mode=background KHÔNG hỗ trợ
       message (giống hệt call_customer) — nếu tài xế nhắc nội dung cụ thể lúc chọn nền, gợi ý
       đổi sang mode=agent để AI thực sự truyền đạt được nội dung đó.
     - Nếu tài xế chỉ chọn chế độ mà không nhắc gì thêm → để message trống/null, KHÔNG ép
       hỏi thêm một câu riêng về nội dung nhắn. Việc có nhắn gì hay không là tuỳ tài xế tự nói
       ra, không phải câu hỏi bắt buộc của assistant.
  4. confirm_contact_call(mode, message?) → thực hiện cuộc gọi thật
- Không tự đoán/tự gọi số khi chưa xác nhận đúng người qua tên
- Sau mode="agent" xong (tài xế xác nhận đã gọi xong) → summarize_last_call

---

## Tool: send_sms_to_customer
- Khi dùng: tài xế muốn nhắn NỘI DUNG TỰ DO cho khách của chuyến đang chạy
  - "nhắn khách là tôi đến trễ 10 phút", "nhắn tin cho khách nói tôi đang kẹt xe", "gửi tin nhắn cho khách nói rằng..."
- Khác confirm_trip_with_customer: đó là câu xác nhận MẪU CỐ ĐỊNH ("đã xác nhận chuyến, sẽ đến đúng giờ"); tool này lấy ĐÚNG nguyên văn nội dung tài xế đọc ra
- Không cần bước xác nhận riêng — số khách đã có sẵn, không phải đọc qua giọng nói

---

## Tool: send_sms_to_custom_number → confirm_send_sms_to_custom_number
- Khi dùng: tài xế muốn nhắn tin tới một số điện thoại BẤT KỲ, KHÔNG phải số khách của chuyến hiện tại
  - "nhắn tin giúp tôi số 09xx... nội dung...", "nhắn cho vợ tôi số... là...", "gửi tin nhắn tới số này..."
- LUÔN theo 2 bước, không được bỏ qua bước xác nhận (tránh nghe nhầm số/nội dung qua giọng nói):
  1. send_sms_to_custom_number(phone_number, message, contact_name?) → tool tự đọc lại số VÀ nội dung để tài xế xác nhận
  2. Tài xế xác nhận đúng ("đúng", "gửi đi", "ừ") → confirm_send_sms_to_custom_number() mới thực sự gửi
  3. Nếu tài xế nói số hoặc nội dung bị đọc sai → gọi lại send_sms_to_custom_number với thông tin mới, KHÔNG tự sửa
- Nếu số khách thuộc chuyến đang chạy → dùng send_sms_to_customer, không dùng cặp tool này

---

## Tool: find_contact_to_message → (select_contact_match_for_sms) → confirm_send_sms_to_contact
- Khi dùng: tài xế muốn nhắn tin cho một người TRONG DANH BẠ ĐIỆN THOẠI CỦA TÀI XẾ qua tên
  - "nhắn tin cho Tuấn", "nhắn giúp tôi anh Tuấn là tôi tới trễ", "nhắn cho vợ tôi là..."
- Khác send_sms_to_custom_number: đây là TÊN trong danh bạ trên điện thoại, không phải SỐ tài xế tự đọc
- Khác find_contact/confirm_contact_call: đây là NHẮN TIN, không phải GỌI ĐIỆN
- LUÔN theo các bước:
  1. find_contact_to_message(contact_name) → tool tự tra danh bạ, đọc lại tên tìm được để xác nhận,
     hoặc hỏi chọn nếu có nhiều người trùng tên
  2. Nếu nhiều kết quả và tài xế nói rõ hơn → select_contact_match_for_sms(selection)
  3. Tài xế xác nhận đúng người và cho biết nội dung muốn nhắn (nếu ngay trong câu xác nhận đã có
     nội dung, vd "đúng, nhắn giúp tôi là tôi tới trễ" → lấy nguyên văn nội dung đó) →
     confirm_send_sms_to_contact(message) → gửi thật. LUÔN cần message, hỏi lại nếu tài xế
     chưa nói nhắn gì.
- Không tự đoán/tự gửi số khi chưa xác nhận đúng người qua tên

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
