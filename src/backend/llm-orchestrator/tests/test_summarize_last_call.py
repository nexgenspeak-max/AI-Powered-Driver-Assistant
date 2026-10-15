"""AVDA-60: summarize_last_call reads back exactly the stored summary of the latest call."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from livekit.agents import StopResponse

from app.voicebot.locales.vn.constants import ERR_NO_SUMMARY, ERR_SUMMARY_FAIL
from app.voicebot.locales.vn.tools.summarize_last_call import summarize_last_call

PATCH = "app.voicebot.locales.vn.tools.summarize_last_call.backend_api.get_latest_call_record"


def _ctx() -> MagicMock:
    ctx = MagicMock()
    ctx.userdata = {"driver_phone": "0900000001", "context": {}}
    ctx.session.say = AsyncMock()
    return ctx


async def _run(ctx) -> str:
    try:
        await summarize_last_call.__wrapped__({}, ctx)
    except StopResponse:
        pass
    return ctx.session.say.await_args.args[0]


@pytest.mark.asyncio
async def test_reads_back_stored_summary_verbatim():
    stored = "Khách An xin chờ thêm 5 phút ở cổng Lotte."
    ctx = _ctx()
    with patch(PATCH, new_callable=AsyncMock, return_value={"call_id": "c1", "summary": stored, "mode": "background"}) as api:
        spoken = await _run(ctx)
    api.assert_awaited_once_with("0900000001")
    assert stored in spoken


@pytest.mark.asyncio
async def test_call_still_running_is_not_summarized():
    ctx = _ctx()
    with patch(PATCH, new_callable=AsyncMock, return_value={"call_id": "c1", "status": "in_progress"}):
        spoken = await _run(ctx)
    assert "đang gọi khách" in spoken


@pytest.mark.asyncio
async def test_no_record_says_no_summary():
    ctx = _ctx()
    with patch(PATCH, new_callable=AsyncMock, return_value={}):
        spoken = await _run(ctx)
    assert ERR_NO_SUMMARY in spoken


@pytest.mark.asyncio
async def test_api_error_reported():
    ctx = _ctx()
    with patch(PATCH, new_callable=AsyncMock, side_effect=RuntimeError("503")):
        spoken = await _run(ctx)
    assert ERR_SUMMARY_FAIL in spoken
