"""Vietnamese-specific strings: greetings, labels, error messages."""

GREETING_INBOUND = "Xin chào! Tôi là trợ lý AI của bạn. Tôi có thể giúp gì cho bạn?"
GREETING_OUTBOUND_PREFIX = "Xin chào! Hệ thống trợ lý tài xế."
GREETING_CUSTOMER = (
    "Xin chào! Tôi là trợ lý AI hỗ trợ khách hàng. "
    "Tôi có thể giúp bạn kiểm tra chuyến xe hoặc các vấn đề liên quan. "
    "Bạn cần hỗ trợ gì ạ?"
)

TRIP_CONFIRMED    = "Đã xác nhận chuyến đi. Chúc anh/chị lái xe an toàn!"
TRIP_REJECTED     = "Đã ghi nhận. Cảm ơn anh/chị!"
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
ERR_NO_ACTIVE_DRIVER = "Hiện tại anh/chị không có chuyến đang hoạt động để gọi cho khách."
ERR_NO_UPCOMING      = "Hiện tại anh/chị không có chuyến đi nào sắp tới."
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
ERR_CUSTOMER_CANCEL_FAIL = "Không thể hủy chuyến lúc này. Vui lòng thử lại."
ERR_ETA_UNCONFIRMED    = "Tài xế chưa xác nhận chuyến. Vui lòng chờ thêm."
