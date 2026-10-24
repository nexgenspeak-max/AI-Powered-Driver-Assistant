"""get_driver_status reports online/offline from context without changing it."""
from unittest.mock import AsyncMock, MagicMock

from livekit.agents import StopResponse

from app.voicebot.processors import context_store
from app.voicebot.locales.vn.tools.get_driver_status import get_driver_status
from app.voicebot.locales.en.tools.get_driver_status import get_driver_status as get_driver_status_en


def _ctx(driver):
    context = MagicMock()
    context.userdata = {"driver_phone": "0900000001"}
    context_store.load_driver_context(context.userdata, {"driver": driver})
    context.session.say = AsyncMock()
    return context


async def _run(tool, context):
    try:
        await tool.__wrapped__({}, context)
    except StopResponse:
        pass
    else:
        raise AssertionError("tool should StopResponse after speaking")
    context.session.say.assert_awaited_once()
    return context.session.say.await_args.args[0]


async def test_online():
    spoken = await _run(get_driver_status, _ctx({"phone": "0900000001", "status": "online", "name": "A"}))
    assert "đang online" in spoken


async def test_offline_case_insensitive():
    spoken = await _run(get_driver_status, _ctx({"phone": "0900000001", "status": "OFFLINE", "name": ""}))
    assert "đang offline" in spoken


async def test_missing_status_does_not_guess():
    spoken = await _run(get_driver_status, _ctx({"phone": "0900000001"}))
    assert "Chưa có dữ liệu" in spoken


async def test_en_twin():
    spoken = await _run(get_driver_status_en, _ctx({"status": "online"}))
    assert "online" in spoken


async def test_does_not_mutate_context():
    context = _ctx({"status": "offline", "name": "B"})
    await _run(get_driver_status, context)
    assert context_store.get(context.userdata, "driver")["status"] == "offline"
