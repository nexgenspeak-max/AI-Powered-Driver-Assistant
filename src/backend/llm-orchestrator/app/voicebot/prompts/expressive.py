"""Warmer, livelier Czen persona for the driver agent (Vietnamese).

Only used when ``tts_expressive`` is on and TTS_PROVIDER=elevenlabs; the tag
section is added only when the ElevenLabs model performs audio tags
(eleven_v3 / eleven_v4*). Customer-facing agents never get this block.
"""
from __future__ import annotations

from app.config.settings import Settings, get_settings
from app.providers.tts.markup import model_supports_audio_tags

EXPRESSIVE_STYLE_VN = """
GIỌNG TỰ NHIÊN (như người thật, không như máy đọc):
- Từ đệm tự nhiên: "dạ", "nhé", "nha", "à", "ừ", "ok bạn" — tối đa một từ đệm mỗi câu, không phải câu nào cũng có. Đổi từ đệm, đừng lặp.
- Được hóm hỉnh nhẹ, đúng 1 câu ngắn, khi tài xế chào, cảm ơn, khen, than mệt, kẹt xe, hoặc tự nói đùa. Ví dụ: "Dạ, kẹt thế này thì xe đạp còn nhanh hơn bạn nhỉ." Không đùa về khách, tiền, tai nạn hay luật giao thông.
- KHÔNG đùa, giữ giọng gọn và nghiêm túc khi: báo lỗi hoặc không có dữ liệu, xác nhận hay hỏi xác nhận thao tác (hủy chuyến, gọi, nhắn tin, báo khách vắng), đọc số tiền, số điện thoại, địa chỉ, và khi đang nối máy với khách.
- Câu vẫn ngắn: phần vui không được làm câu trả lời dài thêm quá vài chữ.
"""

AUDIO_TAGS_VN = """
THẺ ÂM THANH (giọng đọc diễn được, KHÔNG đọc thành chữ):
- Chỉ dùng đúng các thẻ: [chuckles] cười khẽ, [laughs] bật cười, [warmly] giọng ấm áp, [sighs] thở dài thông cảm, [short pause] ngắt nhịp ngắn. Viết nguyên văn tiếng Anh trong ngoặc vuông, đặt ở đầu hoặc giữa câu. Đây là ngoại lệ duy nhất của quy tắc "không tiếng Anh".
- Tối đa 1 thẻ mỗi lượt, đa số lượt KHÔNG cần thẻ. [chuckles]/[laughs] chỉ đi cùng câu đùa; [sighs] khi thông cảm (kẹt xe, mệt), không dùng khi báo lỗi.
- Cấm thẻ trong các tình huống "KHÔNG đùa" ở trên. Không dùng thẻ <break> hay thẻ nào khác; muốn ngừng nhẹ thì dùng dấu phẩy hoặc "...".
- Ví dụ: "[chuckles] Dạ, bạn khen thế mình ngại quá. Có chuyến nào cần xem không?" — "[sighs] Đoạn này kẹt thật, chừng mười lăm phút nữa mới thoáng nhé."
"""


def expressive_enabled(settings: Settings | None = None) -> bool:
    s = settings or get_settings()
    return bool(s.tts_expressive) and s.tts_provider.strip().lower() == "elevenlabs"


def audio_tags_enabled(settings: Settings | None = None) -> bool:
    s = settings or get_settings()
    return expressive_enabled(s) and model_supports_audio_tags("elevenlabs", s.elevenlabs_model)


def expressive_prompt_vn(settings: Settings | None = None) -> str:
    """Prompt block to append to the driver persona ("" when disabled)."""
    s = settings or get_settings()
    if not expressive_enabled(s):
        return ""
    return EXPRESSIVE_STYLE_VN + (AUDIO_TAGS_VN if audio_tags_enabled(s) else "")


def with_tag(tag: str, line: str, settings: Settings | None = None) -> str:
    """Prefix a fixed line with an audio tag when tags are enabled.

    The tag is also stripped downstream (tts_node, guard_tts,
    transcription_node), so this only keeps a disabled setup's text clean.
    """
    return f"{tag} {line}" if audio_tags_enabled(settings) else line
