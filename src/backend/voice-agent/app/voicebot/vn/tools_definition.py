"""
Vietnamese tool schemas.
Each entry is a raw JSON-schema dict consumed by @function_tool(raw_schema=...).
"""

raw_schema = {

    # ── Driver inbound ────────────────────────────────────────────────────────

    "check_upcoming_trips": {
        "type": "function",
        "name": "check_upcoming_trips",
        "description": (
            "Kiểm tra danh sách chuyến đi sắp tới của tài xế. "
            "Gọi khi tài xế hỏi về lịch chuyến, chuyến tiếp theo, hoặc muốn xem danh sách chuyến."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "update_trip_status": {
        "type": "function",
        "name": "update_trip_status",
        "description": (
            "Cập nhật trạng thái chuyến đi hiện tại của tài xế. "
            "Gọi khi tài xế nói đã đến điểm đón, đã đón được khách, hoặc đã hoàn thành chuyến."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "status": {
                    "type": "string",
                    "enum": ["ARRIVED_PICKUP", "PICKED_UP", "COMPLETED"],
                    "description": "Trạng thái mới của chuyến đi.",
                }
            },
            "required": ["status"],
        },
    },

    "call_customer": {
        "type": "function",
        "name": "call_customer",
        "description": (
            "Gọi điện cho khách hàng của chuyến đang hoạt động. "
            "QUAN TRỌNG: Trước khi gọi, hỏi tài xế chọn chế độ:\n"
            "  • mode='agent'  — AI tự gọi và nói chuyện với khách, sau đó tóm tắt lại cho tài xế.\n"
            "  • mode='bridge' — Kết nối để tài xế trực tiếp nói chuyện với khách.\n"
            "Sau khi tài xế chọn xong, mới gọi tool này với đúng mode."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "mode": {
                    "type": "string",
                    "enum": ["agent", "bridge"],
                    "description": "'agent' để AI nói chuyện và tóm tắt, 'bridge' để kết nối trực tiếp.",
                }
            },
            "required": ["mode"],
        },
    },

    "get_customer_location": {
        "type": "function",
        "name": "get_customer_location",
        "description": (
            "Lấy địa điểm đón khách hàng hiện tại. "
            "Gọi khi tài xế hỏi 'khách đứng ở đâu', 'điểm đón ở đâu', 'địa chỉ đón'."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "confirm_trip_with_customer": {
        "type": "function",
        "name": "confirm_trip_with_customer",
        "description": (
            "Gửi tin nhắn SMS xác nhận chuyến đi cho khách hàng. "
            "Gọi khi tài xế muốn thông báo cho khách biết mình đã nhận chuyến và đang trên đường."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "summarize_last_call": {
        "type": "function",
        "name": "summarize_last_call",
        "description": (
            "Lấy và đọc tóm tắt cuộc gọi vừa rồi giữa tài xế và khách hàng. "
            "Gọi khi tài xế hỏi 'cuộc gọi vừa rồi nói gì', 'tóm tắt cuộc gọi', 'khách vừa nói gì'."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "create_reminder": {
        "type": "function",
        "name": "create_reminder",
        "description": (
            "Đặt nhắc nhở tự động trước khi đến giờ đón khách. "
            "Gọi khi tài xế nói 'nhắc tôi', 'đặt nhắc nhở', 'báo tôi trước X phút'. "
            "minutes_before mặc định 10 nếu tài xế không chỉ định."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "minutes_before": {
                    "type": ["integer", "null"],
                    "description": "Số phút trước giờ đón để nhắc nhở. Mặc định 10.",
                }
            },
            "required": [],
        },
    },

    "request_cancel_trip": {
        "type": "function",
        "name": "request_cancel_trip",
        "description": (
            "Bước 1: Hỏi xác nhận trước khi hủy chuyến đang hoạt động. "
            "Gọi khi tài xế muốn hủy chuyến. KHÔNG hủy ngay — phải hỏi xác nhận trước."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "confirm_cancel_trip": {
        "type": "function",
        "name": "confirm_cancel_trip",
        "description": (
            "Bước 2: Thực hiện hủy chuyến sau khi tài xế đã xác nhận. "
            "Chỉ gọi sau khi đã hỏi qua request_cancel_trip và tài xế đã nói 'có'."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    # ── Earnings & profile ────────────────────────────────────────────────────

    "get_today_earnings": {
        "type": "function",
        "name": "get_today_earnings",
        "description": (
            "Xem tổng thu nhập hôm nay của tài xế: doanh thu, số chuyến, thưởng, giờ online. "
            "Gọi khi tài xế hỏi 'hôm nay tôi kiếm được bao nhiêu', 'thu nhập hôm nay', 'doanh thu hôm nay'."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "get_driver_stats": {
        "type": "function",
        "name": "get_driver_stats",
        "description": (
            "Xem thống kê tài xế: điểm đánh giá, tỷ lệ chấp nhận, tỷ lệ hoàn thành, tổng số chuyến. "
            "Gọi khi tài xế hỏi 'điểm của tôi', 'rating của tôi', 'tỷ lệ chấp nhận', 'thống kê tôi'."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "get_bonus_info": {
        "type": "function",
        "name": "get_bonus_info",
        "description": (
            "Xem các chương trình thưởng và vùng tăng giá đang hoạt động. "
            "Gọi khi tài xế hỏi 'có thưởng không', 'vùng tăng giá ở đâu', 'khuyến mãi hôm nay'."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    # ── Trip issue reporting ──────────────────────────────────────────────────

    "report_customer_no_show": {
        "type": "function",
        "name": "report_customer_no_show",
        "description": (
            "Báo cáo khách hàng không xuất hiện tại điểm đón. "
            "Gọi khi tài xế đã đợi đủ thời gian nhưng khách không ra. "
            "Luôn xác nhận với tài xế trước khi báo cáo."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "report_trip_issue": {
        "type": "function",
        "name": "report_trip_issue",
        "description": (
            "Báo cáo sự cố trong chuyến đi: hành vi không phù hợp, hư hỏng xe, địa chỉ sai, v.v. "
            "Gọi khi tài xế muốn phản ánh vấn đề về chuyến đi."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "issue_type": {
                    "type": "string",
                    "enum": ["safety_concern", "vehicle_damage", "inappropriate_behavior", "wrong_address", "other"],
                    "description": "Loại sự cố cần báo cáo.",
                },
                "description": {
                    "type": ["string", "null"],
                    "description": "Mô tả thêm về sự cố (tùy chọn).",
                },
            },
            "required": ["issue_type"],
        },
    },

    "extend_wait_time": {
        "type": "function",
        "name": "extend_wait_time",
        "description": (
            "Yêu cầu thêm thời gian chờ khách tại điểm đón. "
            "Gọi khi tài xế đang chờ và muốn thêm thời gian trước khi bị tính phí chờ."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "minutes": {
                    "type": "integer",
                    "description": "Số phút muốn chờ thêm (1-10).",
                }
            },
            "required": ["minutes"],
        },
    },

    # ── Driver availability ───────────────────────────────────────────────────

    "set_driver_status": {
        "type": "function",
        "name": "set_driver_status",
        "description": (
            "Chuyển trạng thái tài xế: online (nhận chuyến) hoặc offline (nghỉ). "
            "Gọi khi tài xế nói 'tôi muốn nghỉ', 'tắt máy', 'đi offline', hoặc 'bật lại nhận chuyến'."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "online": {
                    "type": "boolean",
                    "description": "True để nhận chuyến (online), False để nghỉ (offline).",
                }
            },
            "required": ["online"],
        },
    },

    # ── Driver outbound ───────────────────────────────────────────────────────

    "confirm_trip": {
        "type": "function",
        "name": "confirm_trip",
        "description": (
            "Xác nhận nhận chuyến đi mới. "
            "Gọi khi tài xế đồng ý, nói 'có', 'nhận', hoặc 'đồng ý' trong cuộc gọi thông báo chuyến mới."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "reject_trip": {
        "type": "function",
        "name": "reject_trip",
        "description": (
            "Từ chối chuyến đi mới. "
            "Gọi khi tài xế không muốn nhận, nói 'không', 'từ chối', hoặc 'bận' trong cuộc gọi thông báo."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    # ── Customer agent ────────────────────────────────────────────────────────

    "get_my_trip": {
        "type": "function",
        "name": "get_my_trip",
        "description": (
            "Lấy thông tin chuyến đi hiện tại của khách hàng: trạng thái, tài xế, ETA, địa chỉ. "
            "Gọi khi khách hỏi 'xe đến chưa', 'chuyến tôi thế nào', 'tài xế ở đâu', 'còn bao lâu'."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "cancel_my_trip": {
        "type": "function",
        "name": "cancel_my_trip",
        "description": (
            "Hủy chuyến đi của khách hàng. "
            "Gọi sau khi khách xác nhận muốn hủy. "
            "Luôn hỏi xác nhận trước: 'Bạn có chắc muốn hủy chuyến không?'"
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "get_driver_eta": {
        "type": "function",
        "name": "get_driver_eta",
        "description": (
            "Lấy thông tin ETA (thời gian dự kiến tài xế đến) và vị trí tài xế. "
            "Gọi khi khách hỏi 'còn bao lâu', 'xe đến chưa', 'tài xế gần chưa'."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
}
