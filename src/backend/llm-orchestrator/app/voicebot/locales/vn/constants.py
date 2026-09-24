"""Vietnamese-specific strings: greetings, labels, error messages."""

from app.voicebot.prompts.concise_driver import CONVERSATIONAL_LLM_VN

GREETING_CONNECT_FILLER = "Chào bạn, tôi là Czen, trợ lý AI của bạn."
GREETING_AFTER_PREFETCH = "Tôi có thể giúp gì cho bạn?"
GREETING_INBOUND = "Chào bạn, mình nghe đây nhé."
GREETING_OUTBOUND_PREFIX = "Alô, chào bạn."
GREETING_CUSTOMER = "Chào bạn, mình có thể giúp gì? Đặt xe, hỏi chuyến đi, hay việc khác cũng được."

CONVERSATIONAL_LLM_INSTRUCTIONS = CONVERSATIONAL_LLM_VN

TRIP_CONFIRMED    = "Đã xác nhận chuyến. Chúc bạn lái xe an toàn!"
TRIP_REJECTED     = "Đã ghi nhận. Cảm ơn bạn!"
TRIP_CANCELLED    = "Đã hủy chuyến đi."

STATUS_LABELS = {
    "ARRIVED_PICKUP": "đã đến điểm đón",
    "PICKED_UP":      "đã đón khách",
    "COMPLETED":      "đã hoàn thành chuyến",
}

TRIP_STATUS_MAP = {
    "pending":   "đang tìm tài xế",
    "notified":  "đã thông báo tài xế",
    "calling":   "đang gọi tài xế",
    "confirmed": "tài xế đã nhận chuyến",
}

# Error messages
ERR_NO_CURRENT_TRIP  = "Hiện tại không có chuyến đang hoạt động."
ERR_NO_ACTIVE_DRIVER = "Hiện tại bạn không có chuyến đang hoạt động để gọi cho khách."
ERR_NO_UPCOMING      = "Hiện tại bạn không có chuyến đi nào sắp tới."
ERR_CANNOT_UPDATE    = "Không thể cập nhật trạng thái lúc này."
ERR_CANNOT_CALL      = "Không thể tìm thấy thông tin khách hàng lúc này."
ERR_CANNOT_CANCEL    = "Không thể hủy chuyến lúc này. Vui lòng thử lại."
ERR_CANNOT_REMINDER  = "Không thể đặt nhắc nhở lúc này."
ERR_NO_TRIP_REMINDER = "Không tìm thấy chuyến đi để đặt nhắc nhở."
ERR_SUMMARY_FAIL     = "Không thể lấy tóm tắt cuộc gọi lúc này."
ERR_NO_SUMMARY       = "Không tìm thấy cuộc gọi nào gần đây."
ERR_LOCATION_FAIL    = "Không thể lấy vị trí khách hàng lúc này."
ERR_NO_LOCATION      = "Không tìm thấy vị trí khách."
ERR_CONFIRM_FAIL     = "Không thể gửi xác nhận lúc này. Vui lòng thử lại."
ERR_NO_PENDING_CANCEL = "Không có yêu cầu hủy chuyến đang chờ xác nhận."
ERR_NO_ACTIVE_CANCEL  = "Không có chuyến đang hoạt động để hủy."
ERR_CUSTOMER_TRIP_FAIL = "Hiện không thể lấy thông tin chuyến đi. Vui lòng thử lại."
ERR_NO_CUSTOMER_TRIP   = "Bạn hiện không có chuyến đi nào đang hoạt động."
ERR_NO_CANCELLABLE     = "Không có chuyến đi nào có thể hủy lúc này."
ERR_ETA_UNCONFIRMED    = "Tài xế chưa xác nhận chuyến. Vui lòng chờ thêm."
ERR_INVALID_CUSTOM_PHONE  = "Số điện thoại này nghe không hợp lệ. Bạn đọc lại giúp em số điện thoại Việt Nam cần gọi."
ERR_CUSTOM_CALL_LIMIT     = "Bạn đã dùng hết số lần gọi số tự do cho phiên này. Vui lòng thử lại ở phiên sau."
ERR_NO_PENDING_CUSTOM_CALL = "Không có số điện thoại nào đang chờ xác nhận. Bạn đọc số cần gọi trước nhé."
ERR_CONTACT_RPC_FAILED     = "Không thể truy cập danh bạ trên điện thoại lúc này. Bạn thử lại sau nhé."
ERR_NO_PENDING_CONTACT_CALL = "Không có yêu cầu gọi điện nào đang chờ xác nhận."
ERR_INVALID_CUSTOM_SMS_PHONE = "Số điện thoại này nghe không hợp lệ. Bạn đọc lại giúp em số điện thoại Việt Nam cần nhắn tin."
ERR_NO_PENDING_CUSTOM_SMS   = "Không có tin nhắn nào đang chờ xác nhận. Bạn đọc lại số và nội dung cần nhắn trước nhé."
ERR_NO_PENDING_REFRESH      = "Hiện không có dữ liệu nào đang chờ làm mới cả."
ERR_NO_PENDING_CONTACT_SMS  = "Không có yêu cầu nhắn tin nào đang chờ xác nhận."
ERR_SMS_SEND_FAILED         = "Không thể gửi tin nhắn lúc này. Vui lòng thử lại."
ERR_NO_SHOW_FAIL            = "Không thể báo cáo khách không xuất hiện lúc này. Vui lòng thử lại."
ERR_EXTEND_WAIT_FAIL        = "Không thể gia hạn thời gian chờ lúc này. Vui lòng thử lại."
ERR_REPORT_ISSUE_FAIL       = "Không thể ghi nhận báo cáo sự cố lúc này. Vui lòng thử lại."
ERR_DRIVER_STATUS_FAIL      = "Không thể cập nhật trạng thái nhận chuyến lúc này. Vui lòng thử lại."
