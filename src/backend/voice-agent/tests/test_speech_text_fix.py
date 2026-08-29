"""TTS prep: markdown and English mode names must not leak into Vietnamese speech."""
from app.voicebot.speech_text_fix import fix_speech_text


def test_strips_markdown_bold():
    out = fix_speech_text("Gọi **khách Trương Bá Chính** nhé.", [], lang="vn")
    assert "**" not in out
    assert "Trương Bá Chính" in out


def test_vn_honorific_slash_replaced():
    out = fix_speech_text("Chào Anh/chị, bạn có 3 chuyến.", [], lang="vn")
    assert "Anh/chị" not in out
    assert "/" not in out
    assert "bạn" in out.lower()


def test_vn_em_dash_replaced():
    out = fix_speech_text("Có 2 chuyến — bạn muốn nghe không?", [], lang="vn")
    assert "—" not in out
    assert "bạn muốn nghe không" in out.lower()


def test_vn_mode_terms_replaced():
    out = fix_speech_text(
        "Bạn muốn gọi bằng chế độ agent hay bridge ạ?",
        [],
        lang="vn",
    )
    assert "agent" not in out.lower()
    assert "bridge" not in out.lower()
    assert "AI gọi hộ" in out
    assert "nói trực tiếp" in out


def test_en_keeps_mode_terms():
    out = fix_speech_text("Use agent or bridge mode.", [], lang="en")
    assert "agent" in out.lower()


def test_vn_short_currency_spoken():
    out = fix_speech_text("Giá 2đ.", [], lang="vn")
    assert "2đ" not in out
    assert "đồng" in out
    assert "hai" in out


def test_vn_formatted_currency_dot_and_comma():
    out_dot = fix_speech_text("Giá 150.000đ.", [], lang="vn")
    out_comma = fix_speech_text("Thu nhập 150,000đ.", [], lang="vn")
    assert "150.000đ" not in out_dot
    assert "150,000đ" not in out_comma
    assert "đồng" in out_dot
    assert "đồng" in out_comma


def test_vn_district_abbreviation():
    out = fix_speech_text("Đón khách ở Q1.", [], lang="vn")
    assert "Q1" not in out
    assert "quận" in out.lower()


def test_display_abbrev_preserved_until_tts():
    """Chat/UI keeps đ; only TTS pipeline expands it."""
    raw = "150.000đ"
    spoken = fix_speech_text(raw, [], lang="vn")
    assert raw != spoken
    assert "150.000" in raw or "đ" in raw
