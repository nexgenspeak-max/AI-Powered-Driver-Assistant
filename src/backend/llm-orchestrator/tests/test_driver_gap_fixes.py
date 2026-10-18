"""Gaps from the driver-talk review: no bonus tool, yes confirms, prompts match call mode."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from livekit.agents import StopResponse

from app.voicebot.processors import context_store, pending_action
from app.voicebot.processors.spoken_intent import handle_driver_utterance
from app.voicebot.registry import inbound_tool_names
from app.voicebot.locales.en.system_instructions import INBOUND_PROMPT as EN_PROMPT
from app.voicebot.locales.vn.system_instructions import INBOUND_PROMPT as VN_PROMPT
from app.voicebot.locales.vn.tools.request_cancel_trip import request_cancel_trip


def test_bonus_tool_is_not_registered():
    assert "get_bonus_info" not in inbound_tool_names("vn")
    assert "get_bonus_info" not in inbound_tool_names("en")
    assert "end_conversation" in inbound_tool_names("en")
    assert "end_call" not in inbound_tool_names("en")


def test_call_mode_prompt_uses_saved_default():
    assert "Hỏi chế độ bằng tiếng Việt rồi mới" not in VN_PROMPT
    assert "Ask mode first" not in EN_PROMPT
    assert "chế độ mặc định" in VN_PROMPT
    assert "saved default" in EN_PROMPT


def _trip_userdata() -> dict:
    userdata: dict = {"driver_phone": "0900000001"}
    context_store.load_driver_context(
        userdata,
        {
            "current_trip": {
                "trip_id": "t-active",
                "status": "confirmed",
                "customer_name": "An",
            }
        },
    )
    return userdata


def _ctx(userdata: dict) -> MagicMock:
    context = MagicMock()
    context.userdata = userdata
    context.session.say = AsyncMock()
    context.session.userdata = userdata
    return context


@pytest.mark.asyncio
async def test_cancel_yes_is_pending_confirm():
    userdata = _trip_userdata()
    context = _ctx(userdata)
    try:
        await request_cancel_trip.__wrapped__({}, context)
    except StopResponse:
        pass
    assert context_store.get_pending_driver_action(userdata)["intent"] == "cancel"
    assert pending_action.should_execute(userdata, "có", "vn") is True
    assert pending_action.is_action_decline("không", "vn") is True


@pytest.mark.asyncio
async def test_decline_clears_cancel_without_api():
    userdata = _trip_userdata()
    context_store.set_pending_driver_action(userdata, "cancel", {"trip_id": "t-active"})
    userdata["pending_cancel_trip_id"] = "t-active"
    session = MagicMock()
    session.userdata = userdata
    session.say = AsyncMock()
    session.interrupt = AsyncMock()
    with pytest.raises(StopResponse):
        await handle_driver_utterance(session, MagicMock(text_content="không"), lang="vn")
    assert context_store.get_pending_driver_action(userdata) is None
    assert userdata["pending_cancel_trip_id"] is None
    assert "không làm nữa" in session.say.await_args.args[0].lower()


@pytest.mark.asyncio
async def test_yes_runs_confirm_cancel():
    userdata = _trip_userdata()
    context_store.set_pending_driver_action(userdata, "cancel", {"trip_id": "t-active"})
    userdata["pending_cancel_trip_id"] = "t-active"
    session = MagicMock()
    session.userdata = userdata
    session.say = AsyncMock()
    session.interrupt = AsyncMock()
    with patch(
        "app.voicebot.locales.vn.tools.confirm_cancel_trip.backend_api.update_trip_status",
        new_callable=AsyncMock,
    ) as update:
        with pytest.raises(StopResponse):
            await handle_driver_utterance(session, MagicMock(text_content="có"), lang="vn")
    update.assert_awaited()
