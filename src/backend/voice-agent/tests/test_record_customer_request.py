"""record_customer_request persists wait/notes for the driver summary."""
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.voicebot.tools.customer_call_tools import (
    _merge_request_notes_into_summary,
    record_customer_request,
)


def _ctx(**userdata) -> SimpleNamespace:
    base = {
        "lang": "vn",
        "driver_phone": "0888887798",
        "customer_call": {"trip_id": "trip-abc-123"},
    }
    base.update(userdata)
    return SimpleNamespace(userdata=base, session=MagicMock())


async def _run(ctx, **kwargs):
    fn = getattr(record_customer_request, "__wrapped__", record_customer_request)
    return await fn(ctx, **kwargs)


@pytest.mark.asyncio
async def test_record_empty_refused():
    result = await _run(_ctx())
    assert "Thiếu" in result


@pytest.mark.asyncio
async def test_record_wait_extends_and_appends():
    ctx = _ctx()
    with patch(
        "app.voicebot.tools.customer_call_tools.backend_api.extend_wait_time",
        new_callable=AsyncMock,
        return_value={"total_wait_minutes": 15},
    ) as ext:
        result = await _run(ctx, wait_minutes=5)

    ext.assert_awaited_once()
    assert ext.await_args.kwargs["extra_minutes"] == 5
    assert "chờ thêm 5 phút" in result
    assert ctx.userdata["_customer_requests"] == ["chờ thêm 5 phút (tổng 15 phút)"]


@pytest.mark.asyncio
async def test_record_note_only_no_api():
    ctx = _ctx()
    with patch(
        "app.voicebot.tools.customer_call_tools.backend_api.extend_wait_time",
        new_callable=AsyncMock,
    ) as ext:
        result = await _run(ctx, note="Nhờ mua nước")

    ext.assert_not_awaited()
    assert "Nhờ mua nước" in result
    assert "Nhờ mua nước" in ctx.userdata["_customer_requests"][0]


@pytest.mark.asyncio
async def test_record_wait_without_trip_refused():
    ctx = _ctx(customer_call={})
    result = await _run(ctx, wait_minutes=3)
    assert "Không có chuyến" in result


def test_merge_notes_into_summary():
    userdata = {"_customer_requests": ["chờ thêm 5 phút", "mua nước"]}
    merged = _merge_request_notes_into_summary(userdata, "Khách xác nhận đón.")
    assert "chờ thêm 5 phút" in merged
    assert "mua nước" in merged
    assert "Khách xác nhận đón" in merged
