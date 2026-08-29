"""Driver utterance corpus from requirements/faq-driver-vi.md + chitchat."""

from __future__ import annotations

from typing import Literal

Intent = Literal[
    "confirm",
    "reject",
    "call_customer",
    "upcoming",
    "current",
    "customer_phone",
    "driving_advice",
    "conversational_ack",
    "earnings",
    "llm_tool",
    "llm_chitchat",
]

# Fast-path: spoken_intent must classify and handle without full Luna prompt.
FAST_PATH: list[tuple[str, Intent]] = [
    ("Hôm nay tôi còn mấy chuyến?", "upcoming"),
    ("Tôi có chuyến nào sắp tới không?", "upcoming"),
    ("Cho tôi xem lịch chuyến.", "upcoming"),
    ("Chuyến tiếp theo của tôi là gì?", "upcoming"),
    ("chuyến sắp tới", "upcoming"),
    ("mấy chuyến", "upcoming"),
    ("Chuyến hiện tại của tôi thế nào?", "current"),
    ("chuyến hiện tại", "current"),
    ("Gọi cho khách giúp tôi.", "call_customer"),
    ("Cho tôi nói chuyện với khách.", "call_customer"),
    ("số điện thoại khách", "customer_phone"),
    ("đọc số khách giúp tôi", "customer_phone"),
    ("Xác nhận nhận chuyến", "confirm"),
    ("Ok, nhận chuyến.", "confirm"),
    ("Không, tôi bận.", "reject"),
    ("Từ chối chuyến này.", "reject"),
    ("cảm ơn nhé", "conversational_ack"),
    ("ok", "conversational_ack"),
    ("vâng", "conversational_ack"),
    ("lịch trình hôm nay", "upcoming"),
    ("Lịch trình của tôi hôm nay", "upcoming"),
    ("thu nhập đi", "earnings"),
    ("Thu nhập hôm nay", "earnings"),
    ("Đi cao tốc cần lưu ý gì", "driving_advice"),
    ("Trời mưa lái sao cho an toàn", "driving_advice"),
    ("Buồn ngủ quá", "driving_advice"),
    ("Kẹt xe quá", "driving_advice"),
]

# Must route to Luna + tools — not misclassified as ack or wrong fast-path.
LLM_TOOL: list[str] = [
    "Tôi đến nơi rồi.",
    "Khách đã lên xe.",
    "Xong chuyến rồi.",
    "Khách đứng ở đâu?",
    "Điểm đón ở đâu?",
    "Cuộc gọi vừa rồi khách nói gì?",
    "Tóm tắt cuộc gọi giúp tôi.",
    "Tôi muốn hủy chuyến.",
    "Cho tôi chờ thêm 5 phút.",
    "Khách chưa ra, tôi cần chờ thêm.",
    "Khách không ra.",
    "Hôm nay tôi kiếm được bao nhiêu?",
    "Thu nhập hôm nay thế nào?",
    "Điểm đánh giá của tôi bao nhiêu?",
    "Hôm nay có thưởng không?",
    "Bật nhận chuyến.",
    "Tôi nghỉ ca.",
    "Bạn có thể giúp gì?",
    "Làm sao để gọi khách?",
]

# Small talk — tool-less Luna, not trip fast-path.
LLM_CHITCHAT: list[str] = [
    "Anh khỏe không",
    "Hôm nay trời đẹp nhỉ",
    "Cảm ơn nhiều",
]

# Multi-turn flows (fast-path only — deterministic spoken output).
MULTI_TURN: list[dict] = [
    {
        "id": "F_count_then_detail",
        "setup_trips": 3,
        "turns": [
            ("mấy chuyến", {"contains": ["3 chuyến"], "forbidden": ["chi tiết", "Khách 1"], "max_chars": 35}),
            ("chuyến 1", {"contains": ["Khách 1"], "max_chars": 80}),
        ],
    },
    {
        "id": "F_thanks_ack",
        "setup_trips": 0,
        "turns": [
            ("cảm ơn", {"max_chars": 40}),
            ("ok", {"max_chars": 30}),
        ],
    },
]
