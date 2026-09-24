"""get_earnings_summary must speak + StopResponse (no LLM rewrite)."""
from unittest.mock import AsyncMock, MagicMock, patch

from livekit.agents import StopResponse

from app.voicebot.locales.vn.tools.get_earnings_summary import get_earnings_summary


async def _run(context, args):
    try:
        await get_earnings_summary.__wrapped__(args, context)
    except StopResponse:
        return
    raise AssertionError("get_earnings_summary should StopResponse")


async def test_earnings_summary_week_speaks_totals():
    context = MagicMock()
    context.userdata = {"driver_phone": "0888887798"}
    context.session.say = AsyncMock()

    with patch(
        "app.voicebot.locales.vn.tools.get_earnings_summary.backend_api.get_earnings_summary",
        new_callable=AsyncMock,
        return_value={"trip_count": 12, "total_earnings": 1_250_000},
    ):
        await _run(context, {"period": "week"})

    spoken = context.session.say.await_args.args[0]
    assert "12 chuyến" in spoken
    assert "1.250.000đ" in spoken
    assert "<Response" not in spoken


async def test_earnings_summary_rejects_lifetime_period():
    context = MagicMock()
    context.userdata = {"driver_phone": "0888887798"}
    context.session.say = AsyncMock()

    with patch(
        "app.voicebot.locales.vn.tools.get_earnings_summary.backend_api.get_earnings_summary",
        new_callable=AsyncMock,
    ) as api:
        await _run(context, {"period": "lifetime"})

    api.assert_not_awaited()
    spoken = context.session.say.await_args.args[0]
    assert "hôm nay" in spoken.lower() or "tuần" in spoken.lower()


async def test_earnings_summary_api_failure_speaks_honest_error():
    context = MagicMock()
    context.userdata = {"driver_phone": "0888887798"}
    context.session.say = AsyncMock()

    with patch(
        "app.voicebot.locales.vn.tools.get_earnings_summary.backend_api.get_earnings_summary",
        new_callable=AsyncMock,
        side_effect=RuntimeError("down"),
    ):
        await _run(context, {"period": "month"})

    assert "Không lấy được" in context.session.say.await_args.args[0]
