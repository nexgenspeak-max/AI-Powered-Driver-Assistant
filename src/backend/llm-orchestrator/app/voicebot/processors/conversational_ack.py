"""Sub-2s replies for short acknowledgments — skip Luna TTFT on voice and chat."""
from __future__ import annotations

import hashlib
import re
import unicodedata

# Do not hijack trip / tool utterances.
_BLOCK_VN = (
    "xác nhận",
    "từ chối",
    "chuyến",
    "khách",
    "số",
    "gọi",
    "thu nhập",
    "doanh thu",
    "tiền",
    "lịch",
    "chờ khách",
    "cao tốc",
    "tháng",
    "tuần",
    "đơn hàng",
    "đơn giao",
    "kiếm",
)

_FAREWELL_BLOCK_VN = (
    "thế thôi",
    "tạm biệt",
    "tắt máy",
    "tắt trợ lý",
    "kết thúc",
    "dừng lại",
    "không có gì",
)
_CONTINUATION_VN = (
    "bây giờ",
    "tôi cần",
    "tôi muốn",
    "rồi tôi",
    "về đón",
    "tiếp theo",
)

# Short tokens must be exact / whole-word — "ừ" is a substring of "vừa"
# ("tháng vừa rồi") and used to hijack earnings follow-ups as ack.
_EXACT_ONLY_ACK_VN = frozenset({"ừ", "uh", "ok", "okay"})

_ACK_VN: list[tuple[tuple[str, ...], tuple[str, ...]]] = [
    (
        ("cảm ơn", "thank", "thanks", "cám ơn"),
        ("Không có gì.", "Không chi.", "Có gì bạn cứ hỏi thêm."),
    ),
    (
        ("ok", "okay", "ừ", "uh"),
        ("Vâng.", "Mình nghe.", "Ok bạn."),
    ),
    (
        ("vâng", "dạ", "được", "hiểu rồi", "rõ rồi", "biết rồi"),
        ("Vâng.", "Mình nghe.", "Bạn cứ nói thêm nếu cần nhé."),
    ),
]


def _norm(text: str) -> str:
    folded = unicodedata.normalize("NFC", text).lower().strip()
    folded = folded.replace("'", "").replace("'", "")
    folded = re.sub(r"[.!?…,;:“”]+", " ", folded)
    return re.sub(r"\s+", " ", folded).strip()


def _ack_needle_matches(needle: str, text: str) -> bool:
    if needle in _EXACT_ONLY_ACK_VN:
        if needle == text:
            return True
        # Whole token only (spaces / edges) — never inside "vừa", "được", …
        return bool(re.search(rf"(?<!\w){re.escape(needle)}(?!\w)", text))
    return needle == text or needle in text


def conversational_ack_reply(text: str, lang: str) -> str | None:
    """Short thanks/ok/vâng — varied VN, no LLM."""
    if lang != "vn":
        return None
    t = _norm(text)
    if not t or len(t) > 36:
        return None
    if any(p in t for p in _BLOCK_VN):
        return None
    if any(p in t for p in _FAREWELL_BLOCK_VN):
        return None
    if any(p in t for p in _CONTINUATION_VN):
        return None
    if "?" in text or t.startswith(("sao", "tại sao", "làm sao", "anh ", "chị ", "em ")):
        return None
    for needles, replies in _ACK_VN:
        if any(_ack_needle_matches(n, t) for n in needles):
            idx = int(hashlib.md5(t.encode()).hexdigest(), 16) % len(replies)
            return replies[idx]
    return None
