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
    "lịch",
    "chờ khách",
    "cao tốc",
)

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


def conversational_ack_reply(text: str, lang: str) -> str | None:
    """Short thanks/ok/vâng — varied VN, no LLM."""
    if lang != "vn":
        return None
    t = _norm(text)
    if not t or len(t) > 36:
        return None
    if any(p in t for p in _BLOCK_VN):
        return None
    if "?" in text or t.startswith(("sao", "tại sao", "làm sao", "anh ", "chị ", "em ")):
        return None
    for needles, replies in _ACK_VN:
        if any(n == t or n in t for n in needles):
            idx = int(hashlib.md5(t.encode()).hexdigest(), 16) % len(replies)
            return replies[idx]
    return None
