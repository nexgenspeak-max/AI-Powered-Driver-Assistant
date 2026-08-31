"""confirm_trip must not crash after a successful backend confirm.

Reproduces the live failure: prefetch stores current_trip as explicit None,
the trip lives in upcoming_trips as notified, update_trip_status succeeds,
then patch_trip_by_id used to AttributeError and the LLM retried.
"""
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from livekit.agents import StopResponse

from app.voicebot.processors import context_store
from app.voicebot.locales.vn.tools.confirm_trip import confirm_trip


def _userdata_with_pending_trip():
    userdata: dict = {"driver_phone": "0888887798"}
    context_store.load_driver_context(
        userdata,
        {
            "current_trip": None,
            "upcoming_trips": [
                {
                    "trip_id": "9973e7ba-796c-4564-b0f7-b00a88670d75",
                    "status": "notified",
                    "customer_name": "Trương Bá Chính",
                    "pickup_address": "Quận 1",
                }
            ],
            "active_trip": None,
        },
    )
    return userdata


async def _run_confirm(context, args=None):
    try:
        await confirm_trip.__wrapped__(args or {"trip_index": 1}, context)
    except StopResponse:
        return
    raise AssertionError("confirm_trip should StopResponse after speaking")


async def test_confirm_trip_succeeds_when_current_trip_is_none():
    userdata = _userdata_with_pending_trip()
    context = MagicMock()
    context.userdata = userdata
    context.session.say = AsyncMock()

    updated = {
        "trip_id": "9973e7ba-796c-4564-b0f7-b00a88670d75",
        "status": "confirmed",
        "customer_name": "Trương Bá Chính",
    }

    with patch(
        "app.voicebot.processors.confirm_trip_flow.backend_api.update_trip_status",
        new_callable=AsyncMock,
        return_value=updated,
    ):
        await _run_confirm(context)

    current = context_store.get_current_trip(userdata)
    assert current is not None
    assert current["trip_id"] == "9973e7ba-796c-4564-b0f7-b00a88670d75"
    assert current["status"] == "confirmed"
    context.session.say.assert_awaited_once()


async def test_confirm_trip_survives_empty_backend_payload():
    userdata = _userdata_with_pending_trip()
    context = MagicMock()
    context.userdata = userdata
    context.session.say = AsyncMock()

    with patch(
        "app.voicebot.processors.confirm_trip_flow.backend_api.update_trip_status",
        new_callable=AsyncMock,
        return_value={},
    ):
        await _run_confirm(context)

    current = context_store.get_current_trip(userdata)
    assert current is not None
    assert current["status"] == "confirmed"
    context.session.say.assert_awaited_once()


async def test_confirm_trip_does_not_raise_if_say_fails_after_backend_ok():
    userdata = _userdata_with_pending_trip()
    context = MagicMock()
    context.userdata = userdata
    context.session.say = AsyncMock(side_effect=RuntimeError("tts down"))

    with patch(
        "app.voicebot.processors.confirm_trip_flow.backend_api.update_trip_status",
        new_callable=AsyncMock,
        return_value={"trip_id": "9973e7ba-796c-4564-b0f7-b00a88670d75", "status": "confirmed"},
    ):
        await _run_confirm(context)

    current = context_store.get_current_trip(userdata)
    assert current is not None
    assert current["status"] == "confirmed"


async def test_confirm_trip_starts_tts_before_patch_returns():
    userdata = _userdata_with_pending_trip()
    context = MagicMock()
    context.userdata = userdata
    order: list[str] = []

    async def slow_patch(*_args, **_kwargs):
        order.append("patch_start")
        await asyncio.sleep(0.05)
        order.append("patch_done")
        return {
            "trip_id": "9973e7ba-796c-4564-b0f7-b00a88670d75",
            "status": "confirmed",
        }

    async def say(*_args, **_kwargs):
        order.append("say_start")
        await asyncio.sleep(0.05)
        order.append("say_done")

    context.session.say = say

    with patch(
        "app.voicebot.processors.confirm_trip_flow.backend_api.update_trip_status",
        side_effect=slow_patch,
    ):
        await _run_confirm(context)

    assert order.index("say_start") < order.index("patch_done")
    current = context_store.get_current_trip(userdata)
    assert current is not None
    assert current["status"] == "confirmed"


class _Handle:
    def __init__(self):
        self.interrupted = False
        self._done = asyncio.Event()

    def interrupt(self):
        self.interrupted = True
        self._done.set()

    def __await__(self):
        return self._done.wait().__await__()


async def test_confirm_trip_accepts_sync_say_handle():
    """LiveKit session.say returns SpeechHandle, not a coroutine."""
    userdata = _userdata_with_pending_trip()
    context = MagicMock()
    context.userdata = userdata
    handle = _Handle()
    handle._done.set()
    context.session.say = MagicMock(return_value=handle)

    with patch(
        "app.voicebot.processors.confirm_trip_flow.backend_api.update_trip_status",
        new_callable=AsyncMock,
        return_value={"trip_id": "9973e7ba-796c-4564-b0f7-b00a88670d75", "status": "confirmed"},
    ):
        await _run_confirm(context)

    context.session.say.assert_called_once()
    current = context_store.get_current_trip(userdata)
    assert current is not None
    assert current["status"] == "confirmed"


async def test_confirm_trip_speaks_when_none_waiting():
    userdata: dict = {"driver_phone": "0888887798"}
    context_store.load_driver_context(userdata, {"current_trip": None, "upcoming_trips": []})
    context = MagicMock()
    context.userdata = userdata
    context.session.say = AsyncMock()

    await _run_confirm(context, args={})

    context.session.say.assert_awaited_once()
    assert "Không có chuyến" in context.session.say.await_args.args[0]
