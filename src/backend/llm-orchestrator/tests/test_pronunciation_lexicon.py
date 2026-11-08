"""pronunciation.toml: LLM text is rewritten into what a Vietnamese voice should say."""
import re

import pytest

from app.voicebot.locales.vn.pronunciations import (
    ABBREVIATION_PATTERNS,
    LEXICON_PATH,
    PLATE_LETTERS,
    PRONUNCIATIONS,
    load_lexicon,
)
from app.voicebot.speech_text_fix import _buffered_fix, fix_speech_text, pronunciations_for_lang

VN = pronunciations_for_lang("vn")


def say(text: str) -> str:
    return fix_speech_text(text, VN, lang="vn")


def test_lexicon_file_loads_and_every_rule_compiles():
    lexicon = load_lexicon(LEXICON_PATH)
    assert lexicon["words"] and lexicon["patterns"] and lexicon["letters"]
    for pattern, _ in ABBREVIATION_PATTERNS:
        re.compile(pattern)


def test_words_are_longest_first():
    keys = [word for word, _ in PRONUNCIATIONS]
    assert keys.index("km/h") < keys.index("km")


def test_product_name_is_said_zen():
    assert say("Mình là Czen, trợ lý của bạn.") == "Mình là Zen, trợ lý của bạn."
    assert "Zen" in say("Trợ lý CZEN đây.")
    assert "Zen" in say("chào czen")


@pytest.mark.parametrize(
    "written, spoken",
    [
        ("30A-123.45", "ba mươi a, một hai ba, bốn năm"),
        ("51G1-678.90", "năm mươi mốt giê một, sáu bảy tám, chín không"),
        ("29A-1234", "hai mươi chín a, một hai ba bốn"),
    ],
)
def test_licence_plates(written, spoken):
    assert say(f"Biển số {written}.") == f"Biển số {spoken}."


def test_plate_letters_cover_the_alphabet_used_on_plates():
    for letter in "ABCDĐEFGHKLMNPSTUVXYZ":
        assert letter in PLATE_LETTERS


def test_plate_series_p_is_not_read_as_minutes():
    out = say("Xe 51P-123.45")
    assert "phút" not in out and "pê" in out


@pytest.mark.parametrize(
    "written, expected",
    [
        ("Khách hẹn 14:30.", "Khách hẹn 14 giờ 30."),
        ("Đón lúc 7:00.", "Đón lúc bảy giờ."),
        ("Đón lúc 5h sáng.", "Đón lúc năm giờ sáng."),
        ("Còn 10p nữa.", "Còn 10 phút nữa."),
        ("Cách 2 km.", "Cách hai cây số."),
        ("Tốc độ 40 km/h.", "Tốc độ 40 cây số một giờ."),
        ("Còn 2,5 km.", "Còn hai phẩy năm cây số."),
        ("Còn 500m.", "Còn 500 mét."),
        ("Giảm 20%.", "Giảm 20 phần trăm."),
        ("Ở TP.HCM, Q1, P.5.", "Ở thành phố Hồ Chí Minh, quận một, phường năm."),
        ("Đi QL1A.", "Đi quốc lộ một A."),
    ],
)
def test_times_units_and_places(written, expected):
    assert say(written) == expected


@pytest.mark.parametrize(
    "written, spoken",
    [
        ("SĐT", "số điện thoại"),
        ("KĐT", "khu đô thị"),
        ("BV", "bệnh viện"),
        ("OTP", "ô tê pê"),
        ("SMS", "ét em ét"),
        ("ETA", "giờ đến dự kiến"),
    ],
)
def test_abbreviations(written, spoken):
    assert say(f"Có {written} rồi.") == f"Có {spoken} rồi."


def test_thousands_groups_stay_money_not_decimals():
    assert say("Cước 150,000đ.") == "Cước một trăm năm mươi nghìn đồng."
    assert say("Cước 157.800đ.") == "Cước một trăm năm mươi bảy nghìn tám trăm đồng."


def test_words_inside_other_words_are_untouched():
    assert say("Bạn đang ở khu BVH.") == "Bạn đang ở khu BVH."
    assert "AIR" in say("Hãng AIR Asia")


def test_english_agent_skips_the_vietnamese_lexicon():
    en = pronunciations_for_lang("en")
    assert fix_speech_text("Czen ETA 30A-123.45", en, lang="en").startswith("Czen")


async def _stream(chunks):
    async def gen():
        for chunk in chunks:
            yield chunk

    return "".join([part async for part in _buffered_fix(gen(), VN, "vn")])


async def test_streamed_words_split_across_chunks_are_still_fixed():
    out = await _stream(["Mình là Cz", "en, xe biển 30", "A-12", "3.45, còn 2 k", "m nhé."])
    assert out == "Mình là Zen, xe biển ba mươi a, một hai ba, bốn năm, còn hai cây số nhé."


async def test_streamed_chunks_keep_spaces_between_words():
    out = await _stream(["Bạn", " có", " 2", " chuyến", ", cước", " 157.", "800", "đ."])
    assert out == "Bạn có hai chuyến, cước một trăm năm mươi bảy nghìn tám trăm đồng."
