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
            "Xem lịch chuyến sắp tới — liệt kê TẤT CẢ chuyến (điểm đón, điểm đến, giá ước tính). "
            "Gọi khi hỏi lịch, chuyến tiếp theo, 'các chuyến còn lại đi đâu', 'bao nhiêu tiền', "
            "'chuyến thứ 2', hoặc follow-up sau khi liệt kê."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "trip_index": {
                    "type": "integer",
                    "description": (
                        "Số thứ tự chuyến (1 = gần nhất). "
                        "Dùng khi tài xế hỏi chi tiết/giá một chuyến cụ thể: "
                        "'chuyến đó bao tiền', 'chuyến thứ 2', 'có' (muốn xem thêm)."
                    ),
                }
            },
            "required": [],
        },
    },

    "get_current_trip_info": {
        "type": "function",
        "name": "get_current_trip_info",
        "description": (
            "Thông tin chuyến đang chạy / active: khách, điểm đón-trả, giá, ETA, trạng thái. "
            "Gọi khi hỏi 'chuyến hiện tại', 'chuyến đang chạy', 'chuyến này bao tiền'."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "get_trip_traffic": {
        "type": "function",
        "name": "get_trip_traffic",
        "description": (
            "Tình trạng giao thông / tắc đường trên chuyến: kẹt xe, ETA, tuyến đường. "
            "Gọi khi hỏi 'có tắc đường không', 'kẹt xe không', 'giao thông thế nào', "
            "'mất bao lâu đến'. Dữ liệu từ Google Maps lúc tạo chuyến."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "trip_index": {
                    "type": "integer",
                    "description": "Số thứ tự chuyến (1 = gần nhất). Bỏ trống = chuyến đang chạy hoặc chuyến gần nhất.",
                }
            },
            "required": [],
        },
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
            "  • mode='background' — AI tự gọi khách ở phòng riêng; tài xế vẫn hỏi trợ lý việc khác; tóm tắt sau (KHUYÊN DÙNG khi tài xế bận).\n"
            "  • mode='agent'  — AI gọi khách vào cùng phòng; tài xế nghe trực tiếp.\n"
            "  • mode='bridge' — Tài xế nói trực tiếp với khách trong cùng phòng.\n"
            "Sau khi tài xế chọn xong, mới gọi tool này với đúng mode."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "mode": {
                    "type": "string",
                    "enum": ["background", "agent", "bridge"],
                    "description": "'background' = AI gọi nền, 'agent' = AI gọi tài xế nghe, 'bridge' = tài xế nói trực tiếp.",
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
            "Lấy và đọc tóm tắt cuộc gọi với khách. "
            "Nếu cuộc gọi nền (background) vẫn đang diễn ra, báo tài xế chờ thêm. "
            "Gọi khi tài xế hỏi 'cuộc gọi vừa rồi nói gì', 'tóm tắt cuộc gọi', 'gọi xong chưa'."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "check_customer_call_status": {
        "type": "function",
        "name": "check_customer_call_status",
        "description": (
            "Kiểm tra cuộc gọi khách nền (background) còn đang diễn ra không. "
            "Gọi khi tài xế hỏi 'gọi xong chưa', 'AI còn gọi khách không'."
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

    # ── App playbook / FAQ (RAG) ──────────────────────────────────────────────

    "answer_app_faq": {
        "type": "function",
        "name": "answer_app_faq",
        "description": (
            "Tra cứu sổ tay hướng dẫn ứng dụng (playbook) để trả lời câu hỏi về "
            "tính năng app, cách sử dụng, quy trình, FAQ chung — KHÔNG cần dữ liệu chuyến realtime. "
            "Gọi khi người dùng hỏi: 'ứng dụng hỗ trợ những gì', 'cách đặt xe', "
            "'làm sao dùng trợ lý AI', 'app có những chức năng gì', 'hướng dẫn sử dụng', "
            "'cách thực hiện chức năng X', câu hỏi how-to / FAQ không liên quan chuyến cụ thể."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "question": {
                    "type": "string",
                    "description": "Câu hỏi gốc của người dùng về app / cách dùng / FAQ.",
                }
            },
            "required": ["question"],
        },
    },
}
