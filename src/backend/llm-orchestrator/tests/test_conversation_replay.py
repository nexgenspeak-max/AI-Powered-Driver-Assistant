"""Regression tests derived from live log sessions (replay without device)."""
from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.voicebot.processors import context_store, pending_action
from app.voicebot.processors.pre_dial import announce_pre_dial
from app.voicebot.processors.schedule_reply import format_schedule_reply
from app.voicebot.processors.spoken_intent import classify_driver_intent
from app.voicebot.tools import bridge_call_tools, customer_call_tools


def _log_session_userdata() -> dict:
    """Fixture mirroring session driver-0900000001-e5ea0a9b (2026-08-30)."""
    userdata: dict = {"driver_phone": "0900000001", "room_name": "test", "context": {}}
    context_store.load_driver_context(
        userdata,
        {
            "current_trip": None,
            "upcoming_trips": [
                {
                    "trip_id": "t-nexgen",
                    "status": "confirmed",
                    "customer_name": "NexGen Speak",
                    "customer_phone": "+848900000001",
                    "pickup_address": "Lotte 54 Liễu Giai, Ba Đình, Hà Nội",
                    "scheduled_pickup": "2026-08-30T12:30:00",
                },
                {
                    "trip_id": "t-bob",
                    "status": "confirmed",
                    "customer_name": "Bob Nguyen",
                    "customer_phone": "+84901234567",
                    "pickup_address": "Pasteur, Quận 3, TP.HCM",
                    "scheduled_pickup": "2026-08-30T18:00:00",
                },
            ],
            "active_trip": None,
        },
    )
    return userdata


def test_replay_schedule_sets_target_trip():
    userdata = _log_session_userdata()
    assert classify_driver_intent("Tôi muốn xem lịch trình hôm nay", "vn") == "upcoming"
    format_schedule_reply(userdata, {"scope": "all"}, lang="vi")
    target = context_store.get_target_trip(userdata)
    assert target is not None
    assert target["trip_id"] == "t-nexgen"


def test_replay_bot_detail_then_call_resolves_nexgen():
    userdata = _log_session_userdata()
    context_store.match_callable_trip_by_text(
        userdata,
        "Chuyến 1 đón NexGen Speak tại Lotte 54 Liễu Giai lúc 12 giờ 30.",
    )
    utterance = "Ok, gọi cho khách bảo tôi chuẩn bị đến rồi"
    context_store.set_last_driver_utterance(userdata, utterance)
    assert classify_driver_intent(utterance, "vn") == "call_customer"
    trip = context_store.resolve_call_target(userdata, utterance=utterance, lang="vi")
    assert trip is not None
    assert trip["trip_id"] == "t-nexgen"


def test_pending_infer_skipped_during_customer_call():
    userdata = _log_session_userdata()
    userdata["customer_call_active"] = True
    pending_action.infer_from_bot_line("Em gọi khách ngay nhé.", userdata, lang="vn")
    assert context_store.get_pending_driver_action(userdata) is None


def test_pre_dial_works_without_run_context_foreground():
    async def _run() -> None:
        session = MagicMock()
        session.say = AsyncMock()
        ctx = SimpleNamespace(session=session)
        await announce_pre_dial(ctx, "Đang gọi NexGen Speak, xin đợi trong giây lát.")
        session.say.assert_awaited_once()

    asyncio.run(_run())


def test_end_customer_call_handoff_message_empty():
    """Only DriverAgent.on_enter speaks resume_summary — no duplicate handoff line."""
    import inspect

    source = inspect.getsource(customer_call_tools.end_customer_call)
    assert "return driver, None" in source
    assert "Tóm tắt:" not in source.split("return driver,")[1]


def test_end_bridge_call_handoff_message_empty():
    import inspect

    source = inspect.getsource(bridge_call_tools.end_bridge_call)
    assert "return driver, None" in source


def test_replay_d0f6c34d_farewell_and_trip_lookup():
    userdata = _log_session_userdata()
    assert classify_driver_intent("Thế thôi, cảm ơn, không có gì.", "vn") == "end_conversation"
    assert classify_driver_intent("tắt máy tắt máy", "vn") == "end_conversation"
    query = "Tôi có một chuyến đón khách ở Liễu Giai là chuyến nào nhỉ?"
    assert classify_driver_intent(query, "vn", userdata) == "trip_lookup"


def test_replay_89ca29f4_schedule_split_stt():
    assert classify_driver_intent("Tôi muốn kiểm tra trình hôm nay", "vn") == "upcoming"
