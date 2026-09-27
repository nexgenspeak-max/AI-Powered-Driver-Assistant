"""Vietnamese keyword-to-tool mapping.

Kept short: JSON tool schemas already carry the long descriptions. Extra
tokens here were ~4k on every turn and pushed confirm_trip LLM TTFT over 1.6s.
"""

# Driver inbound — full toolset. Do not include customer-agent tools.
TOOLS_MAPPING_PROMPT = """<KeywordsMappingForToolUsage>
Tool tự nói kết quả. Đã nói xong → IM LẶNG, không nhắc lại danh sách.

check_upcoming_trips — lịch/chuyến/mấy chuyến/giá. Mặc định tool chỉ nói số chuyến; chi tiết khi có trip_index.
create_walkup_trip — tài xế tự tạo chuyến / đón đường (SĐT + đón + trả; hỏi hàng cồng kềnh / trẻ em).
refresh_latest_data — khi tài xế muốn dữ liệu mới sau câu trả lời cache ("làm mới", "cập nhật", "lấy mới").
get_current_trip_info — chuyến đang chạy, số điện thoại khách (không xếp theo GPS).
suggest_next_stop — nên đi đâu / đang đón ai (theo GPS).
get_trip_traffic — tắc đường, kẹt xe, mất bao lâu.
get_optimal_route — đường đi tối ưu.
confirm_trip — nhận/đồng ý/ok chuyến chưa nhận. Nhiều chuyến chờ: gọi không trip_index trước, rồi gọi lại với số/tên khách.
reject_trip — từ chối chuyến chưa nhận (cùng cách chọn). Đã nhận rồi → request_cancel_trip.
update_trip_status — tiến độ chuyến ĐÃ nhận: arrived_pickup / picked_up / completed. Không dùng để nhận chuyến mới.
call_customer — gọi khách. Mặc định mode=agent (AI gọi hộ, tài xế nghe/chen vào); bridge chỉ khi tài xế nói "nói trực tiếp". Nhiều chuyến: lọc theo địa điểm/tên rồi hỏi — không list toàn bộ lịch. Nudge "có muốn gọi" → mode=agent.
call_custom_number → confirm_call_custom_number — gọi số bất kỳ; luôn đọc lại số rồi mới confirm.
find_contact → confirm_contact_call — gọi theo tên danh bạ; cùng chế độ mặc định như call_customer.
send_sms_to_customer — nhắn nội dung tự do cho khách chuyến đang chạy.
send_sms_to_custom_number → confirm_send_sms_to_custom_number — nhắn số bất kỳ; đọc lại rồi mới gửi.
find_contact_to_message → confirm_send_sms_to_contact — nhắn theo tên danh bạ.
get_customer_location — khách/điểm đón ở đâu.
confirm_trip_with_customer — SMS mẫu xác nhận chuyến với khách.
summarize_last_call — cuộc gọi vừa rồi nói gì.
check_customer_call_status — gọi nền xong chưa.
create_reminder — nhắc trước giờ đón.
request_cancel_trip → confirm_cancel_trip — hủy chuyến đã nhận; luôn hỏi xác nhận.
get_today_earnings — thu nhập hôm nay.
get_earnings_summary — thu nhập tuần/tháng (period=week|month). Không bịa tổng đời.
check_trip_history — chuyến hoàn thành/hủy hôm nay (scope=completed_today|cancelled_today).
get_driver_stats — điểm, rating, thống kê.
report_customer_no_show — khách không ra; chỉ hỏi. Câu có mới ghi nhận, đừng gọi lại tool.
report_trip_issue — báo cáo sự cố.
extend_wait_time — chờ thêm.
set_driver_status — bật/tắt nhận chuyến.
answer_app_faq — hướng dẫn app/FAQ, không phải dữ liệu chuyến.
end_conversation — tạm biệt, tắt trợ lý.
</KeywordsMappingForToolUsage>
"""

# Outbound offer: only confirm/reject.
OUTBOUND_TOOLS_MAPPING_PROMPT = """<KeywordsMappingForToolUsage>
Chỉ 2 tool: confirm_trip (nhận/đồng ý/ok) hoặc reject_trip (không/từ chối/bận).
Tool tự nói kết quả. Đã nói xong → IM LẶNG.
</KeywordsMappingForToolUsage>
"""

# Customer inbound — do not include driver tools.
CUSTOMER_TOOLS_MAPPING_PROMPT = """<KeywordsMappingForToolUsage>
book_trip — đặt xe. Hỏi đủ tên, đón, đến, đón ngay hay hẹn giờ, số điện thoại.
get_my_trip — xe đến chưa, chuyến tôi thế nào, tài xế ở đâu.
request_cancel_my_trip → confirm_cancel_my_trip — hủy chuyến; luôn hỏi xác nhận.
get_driver_eta — còn bao lâu tài xế đến.
call_driver — gặp tài xế. Nếu chưa confirmed thì báo chờ, không gọi tool.
answer_app_faq — hướng dẫn app/FAQ.
</KeywordsMappingForToolUsage>
"""
