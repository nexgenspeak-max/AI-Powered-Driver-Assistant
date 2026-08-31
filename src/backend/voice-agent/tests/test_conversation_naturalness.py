"""Scenario-wide natural-voice coverage — not just 1–2 happy paths."""
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from livekit.agents import StopResponse

from app.voicebot.processors import context_store
from app.voicebot.processors.conversational_ack import _ACK_VN
from app.voicebot.processors.driving_advice import _ADVICE_VN
from app.voicebot.processors.nudge import build_nudge_message
from app.voicebot.processors.spoken_intent import (
    classify_driver_intent,
    handle_driver_utterance,
    needs_tool_llm,
)
from app.voicebot.processors.trip_format import format_trip_count_summary, format_trip_detail
from app.voicebot.speech_text_fix import fix_speech_text
from app.voicebot.testing.conversation_quality import assert_natural_vn, assert_tts_safe_vn
from app.voicebot.locales.vn import constants as vn_constants
from tests.fixtures.driver_scenarios_vn import FAST_PATH, LLM_CHITCHAT, LLM_TOOL, MULTI_TURN


def _sample_trips(n: int) -> list[dict]:
    return [
        {
            "trip_id": f"t{i}",
            "status": "notified",
            "customer_name": f"Khách {i}",
            "pickup_address": f"Quận {i}",
            "dropoff_address": "Mỹ Đình",
            "estimated_fare": 120_000 + i * 1000,
        }
        for i in range(1, n + 1)
    ]


def _canned_vn_corpus() -> list[str]:
    """Every deterministic VN string the driver agent may speak."""
    skip = {"GREETING_CUSTOMER"}  # customer agent only
    texts: list[str] = []
    for name in dir(vn_constants):
        if name in skip:
            continue
        if name.startswith("ERR_") or name.startswith("GREETING") or name.startswith("TRIP_"):
            val = getattr(vn_constants, name)
            if isinstance(val, str):
                texts.append(val)
    texts.append(format_trip_count_summary(_sample_trips(1)))
    texts.append(format_trip_count_summary(_sample_trips(3)))
    texts.append(format_trip_count_summary(_sample_trips(5)))
    texts.append(format_trip_detail(_sample_trips(1)[0], 1, lang="vi"))
    for _, replies in _ACK_VN:
        texts.extend(replies)
    for _, reply in _ADVICE_VN:
        texts.append(reply)
    return texts


@pytest.mark.parametrize("text", _canned_vn_corpus(), ids=lambda t: t[:40])
def test_canned_responses_natural_and_tts_safe(text: str):
    allow_long = len(text) > 180 or "chuyến 1" in text.lower()
    assert_natural_vn(text, allow_long=allow_long, max_chars=280, max_sentences=4)
    assert_tts_safe_vn(text)
    fixed = fix_speech_text(text, [], lang="vn")
    assert_natural_vn(fixed, allow_long=True, max_chars=320, max_sentences=5)


@pytest.mark.parametrize("utterance,expected", FAST_PATH, ids=lambda x: x[0][:36])
def test_faq_fast_path_intent(utterance: str, expected: str):
    assert classify_driver_intent(utterance, "vn") == expected


@pytest.mark.parametrize("utterance", LLM_TOOL, ids=lambda u: u[:36])
def test_faq_tool_phrases_need_llm_not_ack(utterance: str):
    assert classify_driver_intent(utterance, "vn") != "conversational_ack"
    assert needs_tool_llm(utterance, "vn") is True


@pytest.mark.parametrize("utterance", LLM_CHITCHAT, ids=lambda u: u[:36])
def test_chitchat_skips_tool_llm(utterance: str):
    assert needs_tool_llm(utterance, "vn") is False
    assert classify_driver_intent(utterance, "vn") in (None, "conversational_ack")


@pytest.mark.asyncio
@pytest.mark.parametrize("scenario", MULTI_TURN, ids=lambda s: s["id"])
async def test_multi_turn_conversation_flow(scenario: dict):
    n = scenario.get("setup_trips", 0)
    userdata: dict = {"driver_phone": "0900111000"}
    context_store.load_driver_context(
        userdata,
        {"current_trip": None, "upcoming_trips": _sample_trips(n), "active_trip": None},
    )
    session = MagicMock()
    session.userdata = userdata
    session.say = AsyncMock()

    for utterance, rules in scenario["turns"]:
        session.say.reset_mock()
        message = SimpleNamespace(text_content=utterance)
        with patch(
            "app.voicebot.processors.confirm_trip_flow.backend_api.update_trip_status",
            new_callable=AsyncMock,
        ):
            try:
                await handle_driver_utterance(session, message, lang="vn")
            except StopResponse:
                pass
        assert session.say.await_count >= 1, f"no speech for {utterance!r}"
        spoken = session.say.await_args.args[0]
        assert_tts_safe_vn(spoken)
        if "max_chars" in rules:
            assert len(spoken) <= rules["max_chars"], spoken
        for needle in rules.get("contains", []):
            assert needle.lower() in spoken.lower(), spoken
        for bad in rules.get("forbidden", []):
            assert bad.lower() not in spoken.lower(), spoken


@pytest.mark.asyncio
async def test_nudge_messages_natural():
    for kind, payload in (
        ("new_trip_offer", {"customer_name": "An", "pickup_address": "Q1"}),
        ("proximity_pickup", {"customer_name": "Bình", "pickup_address": "Q3"}),
        ("proximity_dropoff", {"customer_name": "Chi", "dropoff_address": "Q7"}),
    ):
        msg = await build_nudge_message(kind, payload, lang="vi")
        assert msg
        assert_natural_vn(msg, max_chars=200, max_sentences=3)
        assert_tts_safe_vn(msg)


@pytest.mark.asyncio
async def test_upcoming_count_first_not_list_dump():
    userdata: dict = {"driver_phone": "0900111000"}
    context_store.load_driver_context(
        userdata,
        {"current_trip": None, "upcoming_trips": _sample_trips(4), "active_trip": None},
    )
    session = MagicMock()
    session.userdata = userdata
    session.say = AsyncMock()
    message = SimpleNamespace(text_content="Hôm nay tôi còn mấy chuyến?")
    try:
        await handle_driver_utterance(session, message, lang="vn")
    except StopResponse:
        pass
    spoken = session.say.await_args.args[0]
    assert "4 chuyến" in spoken
    assert "Khách 1" not in spoken
    assert_natural_vn(spoken)
