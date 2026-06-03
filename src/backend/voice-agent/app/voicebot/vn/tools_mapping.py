"""
Vietnamese keyword-to-tool mapping prompt.
Included in the system instructions to help the LLM choose the right tool.
"""

TOOLS_MAPPING_PROMPT = """<KeywordsMappingForToolUsage>

## Tool: check_upcoming_trips
- Khi dùng: tài xế hỏi về lịch chuyến, "chuyến tiếp theo", "tôi có chuyến nào không", "xem danh sách chuyến"

---

## Tool: update_trip_status
- Khi dùng: tài xế thông báo trạng thái di chuyển
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

## Tool: confirm_trip (outbound only)
- Khi dùng: tài xế đồng ý nhận chuyến mới — "có", "nhận", "đồng ý", "ok"

## Tool: reject_trip (outbound only)
- Khi dùng: tài xế từ chối — "không", "từ chối", "bận", "không nhận"

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

## Tool: get_my_trip (customer agent)
- Khi dùng: "xe đến chưa", "chuyến tôi thế nào", "tài xế ở đâu", "còn bao lâu"

## Tool: cancel_my_trip (customer agent)
- Khi dùng: khách muốn hủy chuyến — hỏi xác nhận trước khi gọi

## Tool: get_driver_eta (customer agent)
- Khi dùng: "còn bao lâu tài xế đến", "tài xế gần chưa", "bao nhiêu phút nữa"

</KeywordsMappingForToolUsage>
"""
