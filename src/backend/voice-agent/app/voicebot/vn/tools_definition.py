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
            "Xem chuyến đi của tài xế — liệt kê chuyến (điểm đón, điểm đến, giá ước tính) trong "
            "đúng phạm vi tài xế muốn. QUAN TRỌNG: nếu tài xế hỏi mơ hồ kiểu 'kiểm tra chuyến "
            "đi', 'chuyến đi thế nào', 'có chuyến nào không' — KHÔNG tự đoán scope, PHẢI hỏi lại "
            "trước: 'Anh/chị muốn xem chuyến đang chạy (đã nhận, đang thực hiện), chuyến sắp tới "
            "(chuyến mới, đang chờ xác nhận), hay cả hai?' rồi mới gọi tool. Nếu tài xế đã nói rõ "
            "trong câu hỏi (vd 'chuyến đang chạy có gì', 'có chuyến mới nào không', 'xem hết cho "
            "tôi') thì gọi thẳng, không cần hỏi lại. Khi hỏi follow-up ('chuyến thứ 2 bao tiền', "
            "'có' muốn xem thêm) → gọi lại với ĐÚNG scope của lần liệt kê gần nhất."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "scope": {
                    "type": "string",
                    "enum": ["in_progress", "upcoming", "all"],
                    "description": (
                        "'in_progress' = chuyến đã nhận, đang thực hiện (đang trên đường đón/đã "
                        "đón khách). 'upcoming' = chuyến mới, chưa xác nhận, đang chờ tài xế "
                        "trả lời. 'all' = cả hai — chỉ dùng khi tài xế đã nói rõ muốn xem tất cả, "
                        "hoặc đã chọn 'cả hai' sau khi được hỏi."
                    ),
                },
                "trip_index": {
                    "type": "integer",
                    "description": (
                        "Số thứ tự chuyến trong danh sách vừa liệt kê (1 = đầu tiên). "
                        "Dùng khi tài xế hỏi chi tiết/giá một chuyến cụ thể: "
                        "'chuyến đó bao tiền', 'chuyến thứ 2', 'có' (muốn xem thêm)."
                    ),
                }
            },
            "required": ["scope"],
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
            "Cập nhật TIẾN ĐỘ của chuyến đi ĐÃ ĐƯỢC NHẬN (đã confirmed) — KHÔNG dùng để nhận "
            "chuyến mới. Gọi khi tài xế nói đã đến điểm đón, đã đón được khách, hoặc đã hoàn "
            "thành chuyến. Nếu tài xế đang muốn ĐỒNG Ý nhận một chuyến mới → dùng confirm_trip, "
            "không phải tool này."
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
            "Gọi điện cho khách hàng của MỘT chuyến đang hoạt động. "
            "NẾU tài xế đang có NHIỀU HƠN 1 chuyến (đã nhận, đang thực hiện): PHẢI hỏi rõ muốn "
            "gọi khách của chuyến nào TRƯỚC — gọi tool này mà chưa có trip_index sẽ tự trả lời "
            "câu hỏi liệt kê các chuyến, đọc lại câu đó cho tài xế nghe rồi chờ tài xế chọn, KHÔNG "
            "tự đoán chuyến nào. Nếu chỉ có 1 chuyến thì không cần hỏi, khỏi cần trip_index. "
            "QUAN TRỌNG: Trước khi gọi thật, hỏi tài xế chọn chế độ:\n"
            "  • mode='background' — AI tự gọi khách ở phòng riêng; tài xế vẫn hỏi trợ lý việc khác; tóm tắt sau (KHUYÊN DÙNG khi tài xế bận).\n"
            "  • mode='agent'  — AI gọi khách vào cùng phòng; tài xế nghe trực tiếp.\n"
            "  • mode='bridge' — Tài xế nói trực tiếp với khách trong cùng phòng.\n"
            "Sau khi tài xế đã chọn đúng chuyến (nếu cần) VÀ đúng chế độ, mới gọi tool này với "
            "đủ mode (và trip_index nếu có nhiều chuyến)."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "mode": {
                    "type": "string",
                    "enum": ["background", "agent", "bridge"],
                    "description": "'background' = AI gọi nền, 'agent' = AI gọi tài xế nghe, 'bridge' = tài xế nói trực tiếp.",
                },
                "trip_index": {
                    "type": "integer",
                    "description": (
                        "Số thứ tự chuyến trong danh sách VỪA được tool này đọc ra (1 = đầu tiên) "
                        "— chỉ cần khi tài xế đang có nhiều hơn 1 chuyến và đã chọn. Để trống nếu "
                        "tài xế chỉ có đúng 1 chuyến, hoặc nếu chưa hỏi tài xế chọn chuyến nào."
                    ),
                },
            },
            "required": ["mode"],
        },
    },

    "call_custom_number": {
        "type": "function",
        "name": "call_custom_number",
        "description": (
            "Bước 1: Gọi điện tới một số điện thoại BẤT KỲ do tài xế đọc ra — không phải số khách "
            "của chuyến hiện tại (vd: người thân, tổng đài, một khách ngoài chuyến). "
            "KHÔNG gọi thẳng tới số — tool này chỉ NHẮC LẠI số để tài xế xác nhận, tránh nghe nhầm "
            "qua giọng nói. Sau khi tài xế xác nhận đúng số ('đúng', 'gọi đi', 'ừ'), mới gọi "
            "confirm_call_custom_number để thực hiện cuộc gọi thật. "
            "Nếu tài xế muốn gọi khách của chuyến đang chạy → dùng call_customer, không dùng tool này."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "phone_number": {
                    "type": "string",
                    "description": "Số điện thoại tài xế vừa đọc ra, giữ nguyên dạng số (vd: '0912345678').",
                },
                "contact_name": {
                    "type": ["string", "null"],
                    "description": (
                        "Tên người/nơi cần gọi nếu tài xế có nói (vd: 'vợ tôi', 'tổng đài'). "
                        "Để trống nếu tài xế chỉ đọc số. Dự phòng cho tính năng gọi theo danh bạ sau này."
                    ),
                },
            },
            "required": ["phone_number"],
        },
    },

    "confirm_call_custom_number": {
        "type": "function",
        "name": "confirm_call_custom_number",
        "description": (
            "Bước 2: Thực hiện gọi số điện thoại tự do sau khi tài xế đã xác nhận đúng số qua "
            "call_custom_number. Chỉ gọi sau khi tài xế nói 'đúng'/'gọi đi'/'ừ' xác nhận số vừa đọc lại."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "find_contact": {
        "type": "function",
        "name": "find_contact",
        "description": (
            "Bước 1: Tìm một người TRONG DANH BẠ ĐIỆN THOẠI CỦA TÀI XẾ theo tên (KHÔNG phải khách "
            "hàng của chuyến — đây là danh bạ cá nhân trên điện thoại tài xế, vd 'gọi cho Tuấn', "
            "'gọi giúp tôi anh Tuấn'). Tool tự tra danh bạ và đọc lại tên tìm được để tài xế xác nhận, "
            "hoặc hỏi chọn nếu có nhiều người trùng tên (dùng select_contact_match). "
            "Sau khi tài xế xác nhận đúng người, hỏi tài xế muốn chế độ gọi nào rồi mới gọi "
            "confirm_contact_call. KHÔNG tự đoán số điện thoại — luôn dựa vào kết quả tra danh bạ."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "contact_name": {
                    "type": "string",
                    "description": "Tên người tài xế muốn gọi, đúng như tài xế đọc ra (vd: 'Tuấn', 'vợ tôi').",
                },
            },
            "required": ["contact_name"],
        },
    },

    "select_contact_match": {
        "type": "function",
        "name": "select_contact_match",
        "description": (
            "Chỉ dùng khi find_contact trả về NHIỀU người trùng tên và tài xế nói rõ hơn là ai "
            "(vd: 'người đầu tiên', 'Tuấn kho', 'số 2'). Không dùng nếu find_contact chỉ trả về 1 người."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "selection": {
                    "type": "string",
                    "description": "Nội dung tài xế nói để chọn ai trong danh sách vừa đọc.",
                },
            },
            "required": ["selection"],
        },
    },

    "confirm_contact_call": {
        "type": "function",
        "name": "confirm_contact_call",
        "description": (
            "Bước cuối: thực hiện gọi thật tới người trong danh bạ đã được xác nhận qua find_contact "
            "(hoặc select_contact_match). Chỉ gọi sau khi: (1) tài xế đã xác nhận ĐÚNG người, "
            "(2) tài xế đã chọn chế độ — hỏi giống call_customer, có đúng 3 lựa chọn:\n"
            "  • mode='background' — AI tự gọi người này ở phòng riêng; tài xế vẫn hỏi trợ lý việc khác; tóm tắt sau (KHUYÊN DÙNG khi tài xế bận).\n"
            "  • mode='agent'  — AI gọi người này vào cùng phòng; tài xế nghe trực tiếp.\n"
            "  • mode='bridge' — Tài xế nói trực tiếp với người này trong cùng phòng.\n"
            "Nếu tài xế chọn mode='agent' và có nhắn nội dung gì cụ thể muốn truyền đạt, điền "
            "vào message (mode='background' không hỗ trợ message, giống hệt call_customer)."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "mode": {
                    "type": "string",
                    "enum": ["background", "agent", "bridge"],
                    "description": "'background' = AI gọi nền, 'agent' = AI gọi tài xế nghe, 'bridge' = tài xế nói trực tiếp.",
                },
                "message": {
                    "type": ["string", "null"],
                    "description": "Nội dung tài xế muốn AI nhắn lại cho người này — chỉ dùng khi mode='agent'. Để trống/null nếu không có gì cụ thể để nhắn.",
                },
            },
            "required": ["mode"],
        },
    },

    "send_sms_to_customer": {
        "type": "function",
        "name": "send_sms_to_customer",
        "description": (
            "Gửi tin nhắn SMS với nội dung TỰ DO do tài xế đọc cho khách hàng của chuyến đang "
            "hoạt động. Khác confirm_trip_with_customer (chỉ gửi 1 câu xác nhận mẫu cố định) — "
            "tool này dùng khi tài xế tự đọc ra nội dung muốn nhắn, ví dụ 'nhắn khách là tôi "
            "đến trễ 10 phút', 'nhắn tin cho khách nói tôi đang kẹt xe'."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "description": "Nội dung tin nhắn tài xế muốn gửi cho khách, đúng như tài xế đọc ra.",
                },
            },
            "required": ["message"],
        },
    },

    "send_sms_to_custom_number": {
        "type": "function",
        "name": "send_sms_to_custom_number",
        "description": (
            "Bước 1: Gửi tin nhắn SMS tới một số điện thoại BẤT KỲ do tài xế đọc ra — không "
            "phải số khách của chuyến hiện tại. KHÔNG gửi thẳng — tool này chỉ NHẮC LẠI số và "
            "nội dung để tài xế xác nhận, tránh nghe nhầm qua giọng nói. Sau khi tài xế xác "
            "nhận đúng ('đúng', 'gửi đi', 'ừ'), mới gọi confirm_send_sms_to_custom_number để "
            "gửi thật. Nếu tài xế muốn nhắn tin cho khách của chuyến đang chạy → dùng "
            "send_sms_to_customer, không dùng tool này."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "phone_number": {
                    "type": "string",
                    "description": "Số điện thoại tài xế vừa đọc ra, giữ nguyên dạng số (vd: '0912345678').",
                },
                "message": {
                    "type": "string",
                    "description": "Nội dung tin nhắn tài xế muốn gửi, đúng như tài xế đọc ra.",
                },
                "contact_name": {
                    "type": ["string", "null"],
                    "description": "Tên người/nơi cần nhắn nếu tài xế có nói (vd: 'vợ tôi'). Để trống nếu tài xế chỉ đọc số.",
                },
            },
            "required": ["phone_number", "message"],
        },
    },

    "confirm_send_sms_to_custom_number": {
        "type": "function",
        "name": "confirm_send_sms_to_custom_number",
        "description": (
            "Bước 2: Thực hiện gửi tin nhắn tới số điện thoại tự do sau khi tài xế đã xác nhận "
            "đúng số và nội dung qua send_sms_to_custom_number. Chỉ gọi sau khi tài xế nói "
            "'đúng'/'gửi đi'/'ừ' xác nhận."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "find_contact_to_message": {
        "type": "function",
        "name": "find_contact_to_message",
        "description": (
            "Bước 1: Tìm một người TRONG DANH BẠ ĐIỆN THOẠI CỦA TÀI XẾ theo tên để NHẮN TIN "
            "(không phải gọi điện) — vd 'nhắn tin cho Tuấn', 'nhắn giúp tôi anh Tuấn là tôi tới "
            "trễ'. Tool tự tra danh bạ và đọc lại tên tìm được để tài xế xác nhận, hoặc hỏi "
            "chọn nếu có nhiều người trùng tên (dùng select_contact_match_for_sms). Sau khi "
            "tài xế xác nhận đúng người và cho biết nội dung muốn nhắn, gọi "
            "confirm_send_sms_to_contact. KHÔNG tự đoán số điện thoại — luôn dựa vào kết quả "
            "tra danh bạ. Nếu tài xế muốn GỌI ĐIỆN (không phải nhắn tin) cho người trong danh "
            "bạ → dùng find_contact, không dùng tool này."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "contact_name": {
                    "type": "string",
                    "description": "Tên người tài xế muốn nhắn tin, đúng như tài xế đọc ra (vd: 'Tuấn', 'vợ tôi').",
                },
            },
            "required": ["contact_name"],
        },
    },

    "select_contact_match_for_sms": {
        "type": "function",
        "name": "select_contact_match_for_sms",
        "description": (
            "Chỉ dùng khi find_contact_to_message trả về NHIỀU người trùng tên và tài xế nói rõ "
            "hơn là ai (vd: 'người đầu tiên', 'Tuấn kho', 'số 2'). Không dùng nếu "
            "find_contact_to_message chỉ trả về 1 người."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "selection": {
                    "type": "string",
                    "description": "Nội dung tài xế nói để chọn ai trong danh sách vừa đọc.",
                },
            },
            "required": ["selection"],
        },
    },

    "confirm_send_sms_to_contact": {
        "type": "function",
        "name": "confirm_send_sms_to_contact",
        "description": (
            "Bước cuối: gửi tin nhắn thật tới người trong danh bạ đã được xác nhận qua "
            "find_contact_to_message (hoặc select_contact_match_for_sms). Chỉ gọi sau khi: "
            "(1) tài xế đã xác nhận ĐÚNG người, (2) tài xế đã cho biết nội dung muốn nhắn — "
            "LUÔN cần message, không được gọi tool này nếu chưa biết nhắn gì."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "description": "Nội dung tin nhắn tài xế muốn gửi cho người này.",
                },
            },
            "required": ["message"],
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
            "Xác nhận NHẬN một chuyến đi mới (chuyến đang ở trạng thái chờ/thông báo, "
            "CHƯA nhận) — đổi trạng thái chuyến thành 'confirmed'. "
            "Gọi khi tài xế đồng ý nhận chuyến: 'có', 'nhận', 'đồng ý', 'tôi sẽ đi chuyến đó', "
            "'tôi xác nhận muốn chở chuyến đó', 'ok chuyến này' — dù đang trong cuộc gọi thông báo "
            "chuyến mới hay đang hỏi assistant bình thường về một chuyến 'notified' trong lịch. "
            "KHÔNG dùng update_trip_status cho việc này — đó là tool báo cáo tiến độ SAU KHI đã nhận chuyến."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "reject_trip": {
        "type": "function",
        "name": "reject_trip",
        "description": (
            "Từ chối một chuyến đi mới (chuyến CHƯA nhận, đang ở trạng thái chờ/thông báo). "
            "Gọi khi tài xế không muốn nhận: 'không', 'từ chối', 'bận', 'bỏ qua chuyến đó' — dù "
            "đang trong cuộc gọi thông báo hay đang hỏi assistant về một chuyến 'notified' trong lịch. "
            "Chuyến ĐÃ nhận rồi muốn hủy → dùng request_cancel_trip, không dùng tool này."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    # ── Customer agent ────────────────────────────────────────────────────────

    "book_trip": {
        "type": "function",
        "name": "book_trip",
        "description": (
            "Đặt một chuyến xe mới cho khách hàng. "
            "Gọi khi khách nói muốn đặt xe, cần đi đâu đó, hoặc cần xe đón. "
            "Trước khi gọi, PHẢI hỏi đủ nếu chưa có: tên khách hàng, điểm đón, điểm đến, "
            "khách muốn xe đón NGAY BÂY GIỜ hay HẸN GIỜ khác, và khách muốn tài xế liên "
            "hệ qua số điện thoại đã đăng ký tài khoản (đọc số đó ra cho khách nghe) hay "
            "một số khác. Không tự bịa thông tin còn thiếu."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "customer_name": {
                    "type": "string",
                    "description": "Tên của khách hàng đặt xe.",
                },
                "pickup_address": {
                    "type": "string",
                    "description": "Địa chỉ điểm đón khách.",
                },
                "dropoff_address": {
                    "type": "string",
                    "description": "Địa chỉ điểm đến.",
                },
                "pickup_time": {
                    "type": "string",
                    "description": (
                        "Thời điểm đón khách, định dạng ISO 8601 "
                        "(YYYY-MM-DDTHH:mm:ss), theo giờ Việt Nam. "
                        "Để trống ('') nếu khách muốn xe đón NGAY BÂY GIỜ. "
                        "Nếu khách hẹn giờ khác (vd: '7 giờ tối nay', '8h sáng mai'), "
                        "tự tính ra ngày giờ cụ thể dựa trên THỜI ĐIỂM HIỆN TẠI "
                        "được cung cấp trong hướng dẫn hệ thống."
                    ),
                },
                "contact_phone": {
                    "type": "string",
                    "description": (
                        "Số điện thoại tài xế dùng để liên hệ khách cho chuyến này. "
                        "Để trống ('') nếu khách đồng ý dùng SỐ ĐÃ ĐĂNG KÝ TÀI KHOẢN "
                        "(số này được cung cấp trong hướng dẫn hệ thống — PHẢI đọc số "
                        "đó ra cho khách nghe rồi hỏi có muốn dùng số này không). "
                        "Nếu khách muốn dùng số khác, điền số khách vừa đọc vào đây."
                    ),
                },
            },
            "required": [
                "customer_name", "pickup_address", "dropoff_address",
                "pickup_time", "contact_phone",
            ],
        },
    },

    "get_my_trip": {
        "type": "function",
        "name": "get_my_trip",
        "description": (
            "Lấy thông tin chuyến đi hiện tại của khách hàng: trạng thái, tài xế, ETA, địa chỉ. "
            "Gọi khi khách hỏi 'xe đến chưa', 'chuyến tôi thế nào', 'tài xế ở đâu', 'còn bao lâu'."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "request_cancel_my_trip": {
        "type": "function",
        "name": "request_cancel_my_trip",
        "description": (
            "Bước 1: Hỏi xác nhận trước khi hủy chuyến của khách hàng. "
            "Gọi khi khách muốn hủy chuyến. KHÔNG hủy ngay — phải hỏi xác nhận trước."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "confirm_cancel_my_trip": {
        "type": "function",
        "name": "confirm_cancel_my_trip",
        "description": (
            "Bước 2: Thực hiện hủy chuyến sau khi khách đã xác nhận. "
            "Chỉ gọi sau khi đã hỏi qua request_cancel_my_trip và khách đã nói 'có'. "
            "Sau khi hủy, chuyến này KHÔNG thể đổi trạng thái nữa — khách phải đặt chuyến mới."
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

    "call_driver": {
        "type": "function",
        "name": "call_driver",
        "description": (
            "Kết nối trực tiếp khách hàng với tài xế qua điện thoại (chế độ nghe trực tiếp). "
            "CHỈ dùng khi chuyến đã có tài xế xác nhận (status=confirmed) — nếu chưa, báo khách "
            "chờ thêm, không gọi tool này. "
            "Gọi khi khách muốn nói chuyện trực tiếp với tài xế, hỏi đường, dặn dò tài xế..."
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
    "end_conversation": {
        "type": "function",
        "name": "end_conversation",
        "description": (
            "Chủ động kết thúc cuộc gọi với trợ lý AI theo yêu cầu của tài xế. "
            "Gọi khi tài xế nói lời tạm biệt hoặc yêu cầu dừng/tắt trợ lý, ví dụ: "
            "'tạm biệt', 'thôi tắt đi', 'kết thúc trợ lý', 'dừng lại nhé', 'thế thôi nha'. "
            "KHÔNG gọi khi tài xế chỉ đang tạm dừng nói hoặc đang bận việc khác."
        ),
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
}
