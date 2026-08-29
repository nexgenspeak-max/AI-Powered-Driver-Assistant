"""Pending action — confirm executes promised tool work instead of empty ack."""
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from livekit.agents import StopResponse

from app.voicebot.processors import context_store, pending_action
from app.voicebot.processors.spoken_intent import classify_driver_intent, handle_driver_utterance


def _userdata():
    userdata = {"driver_phone": "0888887798", "room_name": "test-room", "context": {}}
    context_store.load_driver_context(
        userdata,
        {
            "current_trip": None,
            "upcoming_trips": [
                {
                    "trip_id": "t1",
                    "status": "confirmed",
                    "customer_name": "NexGen Speak",
                    "customer_phone": "+848888887798",
                    "pickup_address": "123 Lê Lợi",
                    "scheduled_pickup": "2026-08-30T12:30:00",
                },
            ],
            "active_trip": None,
        },
    )
    return userdata


def test_infer_from_bot_line_sets_check_pending():
    userdata = _userdata()
    context_store.set_last_driver_utterance(
        userdata, "Hôm nay tối NexGen Speak vào lúc mấy giờ?"
    )
    pending_action.infer_from_bot_line(
        "Em kiểm tra lịch chuyến cho bạn nhé.",
        userdata,
        lang="vn",
    )
    pending = context_store.get_pending_driver_action(userdata)
    assert pending is not None
    assert pending["intent"] == "upcoming"
    assert pending["args"].get("trip_index") == 1


def test_infer_from_bot_line_sets_call_pending_with_message():
    userdata = _userdata()
    context_store.set_target_trip(userdata, userdata["context"]["upcoming_trips"][0])
    pending_action.infer_from_bot_line(
        "Em nhắn khách là bạn sẽ đến đón sau 10 phút nhé.",
        userdata,
        lang="vn",
    )
    pending = context_store.get_pending_driver_action(userdata)
    assert pending is not None
    assert pending["intent"] == "call_customer"
    assert "10 phút" in (pending["args"].get("message") or "")


def test_ok_is_confirm_when_pending():
    userdata = _userdata()
    context_store.set_pending_driver_action(userdata, "upcoming", {"scope": "all"})
    assert pending_action.is_action_confirm("Ok.", "vn")
    assert pending_action.should_execute(userdata, "Ok.", "vn")


def test_complaint_is_not_confirm():
    userdata = _userdata()
    context_store.set_pending_driver_action(userdata, "upcoming", {"scope": "all"})
    assert not pending_action.should_execute(
        userdata,
        "Sao bạn nói vâng rồi mà lại không kiểm tra?",
        "vn",
    )


def test_execute_nudge_triggers_pending():
    userdata = _userdata()
    context_store.set_pending_driver_action(userdata, "call_customer", {"mode": "agent"})
    assert pending_action.should_execute(userdata, "Thì gọi đi.", "vn")


def test_ok_executes_pending_check_not_ack():
    import asyncio

    async def _run():
        userdata = _userdata()
        context_store.set_pending_driver_action(
            userdata, "upcoming", {"scope": "all", "trip_index": 1}
        )
        session = MagicMock()
        session.userdata = userdata
        session.say = AsyncMock()
        message = SimpleNamespace(text_content="Ok.")

        with patch(
            "app.voicebot.vn.tools.check_upcoming_trips.check_upcoming_trips.__wrapped__",
            new=AsyncMock(side_effect=StopResponse()),
        ) as mock_check:
            try:
                await handle_driver_utterance(session, message, lang="vn")
            except StopResponse:
                pass
            mock_check.assert_called_once()
            assert mock_check.call_args.args[0]["trip_index"] == 1

        assert context_store.get_pending_driver_action(userdata) is None
        assert classify_driver_intent("Ok.", "vn") == "conversational_ack"

    asyncio.run(_run())
