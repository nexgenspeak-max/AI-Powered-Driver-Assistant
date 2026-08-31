"""reject_trip speaks confirmation and StopResponse so the LLM cannot rewrite."""
from unittest.mock import AsyncMock, MagicMock, patch

from livekit.agents import StopResponse

from app.voicebot.processors import context_store
from app.voicebot.locales.vn.constants import TRIP_REJECTED
from app.voicebot.locales.vn.tools.reject_trip import reject_trip


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
        },
    )
    return userdata


async def _run_reject(context, args=None):
    try:
        await reject_trip.__wrapped__(
            {"trip_index": 1} if args is None else args,
            context,
        )
    except StopResponse:
        return
    raise AssertionError("reject_trip should StopResponse after speaking")


async def test_reject_trip_speaks_and_patches_in_parallel():
    userdata = _userdata_with_pending_trip()
    context = MagicMock()
    context.userdata = userdata
    context.session.say = AsyncMock()

    with patch(
        "app.voicebot.processors.confirm_trip_flow.backend_api.update_trip_status",
        new_callable=AsyncMock,
        return_value={
            "trip_id": "9973e7ba-796c-4564-b0f7-b00a88670d75",
            "status": "rejected",
        },
    ) as patch_status:
        await _run_reject(context)

    patch_status.assert_awaited_once()
    assert patch_status.await_args.args[1] == "rejected"
    context.session.say.assert_awaited_once()
    assert context.session.say.await_args.args[0] == TRIP_REJECTED
    current = context_store.get_current_trip(userdata)
    assert current is None
    upcoming = context_store.get_upcoming_trips(userdata)
    assert upcoming[0]["status"] == "rejected"


async def test_reject_trip_asks_which_when_ambiguous():
    userdata: dict = {"driver_phone": "0888887798"}
    context_store.load_driver_context(
        userdata,
        {
            "upcoming_trips": [
                {
                    "trip_id": "a",
                    "status": "notified",
                    "customer_name": "An",
                    "pickup_address": "Quận 1",
                },
                {
                    "trip_id": "b",
                    "status": "notified",
                    "customer_name": "Bình",
                    "pickup_address": "Quận 3",
                },
            ]
        },
    )
    context = MagicMock()
    context.userdata = userdata
    context.session.say = AsyncMock()

    await _run_reject(context, args={})

    context.session.say.assert_awaited_once()
    spoken = context.session.say.await_args.args[0]
    assert "An" in spoken
    assert "Bình" in spoken
