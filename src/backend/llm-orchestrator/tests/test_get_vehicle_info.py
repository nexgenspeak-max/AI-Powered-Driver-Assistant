"""get_vehicle_info reads vehicle_type/plate/name from the prefetched driver record."""
from unittest.mock import AsyncMock, MagicMock

from livekit.agents import StopResponse

from app.voicebot.processors import context_store
from app.voicebot.locales.vn.tools.get_vehicle_info import get_vehicle_info, build_vehicle_response
from app.voicebot.locales.en.tools.get_vehicle_info import get_vehicle_info as get_vehicle_info_en


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


async def test_speaks_name_type_and_plate():
    spoken = await _run(get_vehicle_info, _ctx({
        "phone": "0900000001", "vehicle_type": "7 chỗ", "vehicle_plate": "30A-123.45", "vehicle_name": "Toyota Innova",
    }))
    assert "Toyota Innova" in spoken and "7 chỗ" in spoken and "30A-123.45" in spoken


async def test_partial_record_skips_missing_fields():
    spoken = await _run(get_vehicle_info, _ctx({"vehicle_plate": "29B-678.90"}))
    assert "29B-678.90" in spoken
    assert "loại" not in spoken and "xe None" not in spoken


async def test_no_vehicle_does_not_guess():
    spoken = await _run(get_vehicle_info, _ctx({"phone": "0900000001", "status": "online"}))
    assert "Chưa có dữ liệu xe" in spoken


async def test_en_twin():
    spoken = await _run(get_vehicle_info_en, _ctx({"vehicle_type": "SUV", "vehicle_plate": "30A-123.45"}))
    assert "SUV" in spoken and "30A-123.45" in spoken


def test_builder_tolerates_non_dict():
    assert "Chưa có dữ liệu xe" in build_vehicle_response(None, lang="vi").spoken()
