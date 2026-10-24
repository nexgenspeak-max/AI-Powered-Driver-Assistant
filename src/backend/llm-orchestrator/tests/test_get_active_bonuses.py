"""get_active_bonuses reads the prefetched active_bonuses list and speaks it."""
from unittest.mock import AsyncMock, MagicMock

from livekit.agents import StopResponse

from app.voicebot.processors import context_store
from app.voicebot.locales.vn.tools.get_active_bonuses import get_active_bonuses, build_bonuses_response
from app.voicebot.locales.en.tools.get_active_bonuses import get_active_bonuses as get_active_bonuses_en


def _ctx(bonuses):
    context = MagicMock()
    context.userdata = {"driver_phone": "0900000001"}
    context_store.load_driver_context(context.userdata, {"active_bonuses": bonuses})
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


async def test_speaks_each_bonus_with_amount_and_expiry():
    spoken = await _run(get_active_bonuses, _ctx([
        {"description": "Vùng trung tâm — tăng giá 1.2x", "amount": "20%", "expires_at": "23:59 hôm nay"},
    ]))
    assert "một ưu đãi" in spoken
    assert "20%" in spoken and "23:59" in spoken


async def test_no_bonuses_says_none_without_inventing():
    spoken = await _run(get_active_bonuses, _ctx([]))
    assert "không có" in spoken
    assert "%" not in spoken


async def test_en_twin_uses_same_data():
    spoken = await _run(get_active_bonuses_en, _ctx([
        {"description": "Downtown surge", "amount": "20%", "expires_at": "23:59 today"},
        {"description": "Airport run", "amount": "50.000đ", "expires_at": ""},
    ]))
    assert "2 active bonuses" in spoken
    assert "Airport run, 50.000đ" in spoken  # no ", until" when expiry is empty


def test_builder_ignores_malformed_rows():
    r = build_bonuses_response([None, "x", {"description": "A", "amount": "1%"}], lang="vi")
    assert "một ưu đãi" in r.spoken()
