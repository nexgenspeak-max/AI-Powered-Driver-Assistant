"""Sub-2s Vietnamese answers for common on-the-road questions.

These are specific situational guidance (not trip-data tools). Unmatched
questions still go to the LLM.
"""
from __future__ import annotations

import re
import unicodedata

# Trip / app-data phrases — never hijack with driving tips.
_TRIP_BLOCK_VN = (
    "xác nhận",
    "từ chối",
    "thu nhập",
    "giá chuyến",
    "số khách",
    "số điện thoại",
    "gọi khách",
    "chuyến sắp",
    "chuyến hiện",
    "danh sách chuyến",
    "lịch trình",
)

_ADVICE_VN: list[tuple[tuple[str, ...], str]] = [
    (
        ("chờ khách", "đợi khách", "khách lâu", "khách không ra", "khách chưa xuống"),
        "Bạn nhắn hoặc gọi khách báo mình đang ở điểm đón và xác nhận vị trí. "
        "Nếu đã hết thời gian chờ miễn phí trên app mà khách vẫn không ra, "
        "bạn có thể báo khách không xuất hiện, mình sẽ hỏi xác nhận trước khi thực hiện.",
    ),
    (
        ("cao tốc", "đường cao tốc"),
        "Trước khi vào cao tốc, bạn kiểm tra lốp và nhiên liệu, chọn đúng làn vào. "
        "Giữ khoảng cách an toàn, chạy đúng tốc độ; không dừng trên làn khẩn cấp trừ tình huống bất khả kháng.",
    ),
    (
        ("mưa", "trơn", "sương mù", "trời mưa"),
        "Khi trời mưa, bạn giảm tốc, bật đèn gầm và tăng khoảng cách vì đường trơn, tầm nhìn kém. "
        "Tránh phanh gấp và vào cua mạnh; mưa quá lớn thì tìm chỗ an toàn dừng tạm rồi chạy tiếp.",
    ),
    (
        ("buồn ngủ", "mệt", "ngủ gật", "lái đêm"),
        "Nếu buồn ngủ, bạn dừng xe an toàn nghỉ 15 đến 20 phút hoặc kết thúc ca, không cố chạy thêm. "
        "Uống nước và đi lại vài phút thường hiệu quả hơn cố nói chuyện để tỉnh.",
    ),
    (
        ("tai nạn", "va chạm", "sự cố", "hỏng xe"),
        "Khi có sự cố, bạn bật cảnh báo, đưa xe vào lề an toàn và kiểm tra người liên quan. "
        "Gọi 113 nếu có thương vong; chụp hiện trường và trao đổi thông tin trước khi rời đi.",
    ),
    (
        ("phạt", "vi phạm", "luật giao thông", "biển báo"),
        "Bạn tuân thủ tốc độ, làn đường và đèn tín hiệu; thắt dây an toàn và không dùng điện thoại khi lái. "
        "Khi không chắc biển báo, ưu tiên giảm tốc và quan sát xe phía trước thay vì vượt ẩu.",
    ),
    (
        ("đón sân bay", "sân bay", "bãi đón"),
        "Ở sân bay, bạn vào đúng khu đón theo biển chỉ và không dừng lâu làn lưu thông. "
        "Nhắn khách điểm đón cụ thể; nếu bến đón đông, tuần tra vòng ngắn thay vì đỗ sai quy định.",
    ),
    (
        ("kẹt xe", "tắc đường", "đông đèn"),
        "Khi kẹt xe, bạn giữ khoảng cách với xe trước, tránh đổi làn liên tục và tắt máy nếu dừng lâu. "
        "Bật xi-nhan sớm khi cần rẽ; nếu trễ giờ đón khách, nhắn khách qua app hoặc gọi ngắn báo trễ.",
    ),
]


def _norm(text: str) -> str:
    folded = unicodedata.normalize("NFC", text).lower().strip()
    folded = folded.replace("'", "").replace("'", "")
    folded = re.sub(r"[.!?…,;:“”]+", " ", folded)
    return re.sub(r"\s+", " ", folded).strip()


def driving_advice_reply(text: str, lang: str) -> str | None:
    """Return a concrete VN reply when the utterance matches a known driving topic."""
    if lang != "vn":
        return None
    t = _norm(text)
    if not t or any(p in t for p in _TRIP_BLOCK_VN):
        return None
    for needles, reply in _ADVICE_VN:
        if any(n in t for n in needles):
            return reply
    return None
