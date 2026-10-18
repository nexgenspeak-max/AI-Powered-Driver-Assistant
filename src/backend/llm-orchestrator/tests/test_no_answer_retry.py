"""AVDA-120: background-call no-answer redial policy (max 2 redials, >= 60 s apart)."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.voicebot.processors import no_answer_retry as retry
from app.voicebot.processors import sip_call_watch as watch

W = "app.voicebot.processors.sip_call_watch"


def _userdata(attempt: int = 0, **extra) -> dict:
    ud = {
        "lang": "vn",
        "isolated_call": True,
        "customer_call": {
            "mode": "background", "call_id": "c1", "trip_id": "t1", "customer_phone": "0901111111",
            "customer_name": "An", "driver_phone": "0900000001", "driver_room_name": "driver-room",
            "retry_attempt": attempt, "lang": "vn",
        },
    }
    ud.update(extra)
    return ud


def test_policy_allows_two_redials():
    assert retry.MAX_REDIALS == 2 and retry.REDIAL_DELAY_SECONDS >= 60
    assert [retry.next_attempt(n) for n in (0, 1, 2)] == [1, 2, None]


@pytest.mark.asyncio
async def test_redial_waits_then_dials_background_with_next_attempt():
    sleep, start = AsyncMock(), AsyncMock(return_value={"call_id": "c2"})
    ok = await retry.redial_after_delay(
        _userdata()["customer_call"], 1, sleep=sleep, start_call=start,
        get_trip=AsyncMock(return_value={"status": "confirmed"}),
    )
    assert ok is True
    sleep.assert_awaited_once_with(retry.REDIAL_DELAY_SECONDS)
    kw = start.await_args.kwargs
    assert kw["mode"] == "background" and kw["retry_attempt"] == 1 and kw["phone_number"] == "0901111111"
    assert kw["room_name"] == "driver-room"  # result still reaches the driver's room


@pytest.mark.asyncio
async def test_redial_failure_returns_false():
    ok = await retry.redial_after_delay({}, 1, sleep=AsyncMock(), start_call=AsyncMock(side_effect=RuntimeError("503")))
    assert ok is False


@pytest.mark.asyncio
async def test_first_no_answer_notifies_driver_and_redials():
    ud = _userdata(0)
    with patch(f"{W}.notify_driver_of_background_call_result", new_callable=AsyncMock) as notify, \
         patch(f"{W}.disconnect_sip_participant", new_callable=AsyncMock) as hangup, \
         patch.object(retry, "redial_after_delay", new_callable=AsyncMock, return_value=True) as redial, \
         patch(f"{W}.complete_isolated_call", new_callable=AsyncMock) as complete:
        await watch._background_no_answer(MagicMock(), ud, "vn")
    assert "gọi lại sau 60 giây (lần gọi lại 1/2)" in notify.await_args.args[1]
    hangup.assert_awaited()
    assert redial.await_args.args[1] == 1
    assert complete.await_args.kwargs["notify_driver"] is False  # driver already told
    assert ud["_redial_pending"] is False


@pytest.mark.asyncio
async def test_redials_exhausted_tells_driver_it_failed():
    ud = _userdata(2)
    with patch.object(retry, "redial_after_delay", new_callable=AsyncMock) as redial, \
         patch(f"{W}.complete_isolated_call", new_callable=AsyncMock) as complete:
        await watch._background_no_answer(MagicMock(), ud, "vn")
    redial.assert_not_awaited()
    assert "gọi An 3 lần nhưng khách không nghe máy" in complete.await_args.args[2]


@pytest.mark.asyncio
async def test_second_trigger_during_redial_is_ignored():
    ud = _userdata(0, _redial_pending=True)
    with patch.object(retry, "redial_after_delay", new_callable=AsyncMock) as redial:
        await watch._background_no_answer(MagicMock(), ud, "vn")
    redial.assert_not_awaited()


@pytest.mark.asyncio
async def test_room_not_torn_down_while_redial_pending():
    ud = _userdata(0, _redial_pending=True)
    with patch(f"{W}.backend_api.complete_background_call", new_callable=AsyncMock) as done:
        await watch.complete_isolated_call(MagicMock(), ud, "x")
    done.assert_not_awaited()
    assert not ud.get("_isolated_call_done")


@pytest.mark.asyncio
async def test_answer_on_redial_continues_normally():
    """Redial 2 picked up: the no-answer teardown must not end the live call."""
    ud = _userdata(2, _isolated_call_answered=True)
    with patch(f"{W}.complete_isolated_call", new_callable=AsyncMock) as complete, \
         patch(f"{W}.disconnect_sip_participant", new_callable=AsyncMock) as hangup:
        await watch.teardown_unanswered_call(MagicMock(), ud)
    complete.assert_not_awaited()
    hangup.assert_not_awaited()


@pytest.mark.asyncio
async def test_redial_survives_the_job_coroutine_being_cancelled():
    """Live 2026-10-18: the room closed mid-delay and redial 2/2 was lost."""
    import asyncio

    ud = _userdata(1)
    dialled = asyncio.Event()

    async def slow_redial(meta, attempt):
        await asyncio.sleep(0.05)
        dialled.set()
        return True

    with patch(f"{W}.notify_driver_of_background_call_result", new_callable=AsyncMock), \
         patch(f"{W}.disconnect_sip_participant", new_callable=AsyncMock), \
         patch.object(retry, "redial_after_delay", side_effect=slow_redial), \
         patch(f"{W}.complete_isolated_call", new_callable=AsyncMock):
        caller = asyncio.ensure_future(watch._background_no_answer(MagicMock(), ud, "vn"))
        await asyncio.sleep(0.01)
        caller.cancel()  # job shutdown cancels the agent coroutine
        await asyncio.wait_for(dialled.wait(), timeout=1.0)
    assert dialled.is_set()
    assert ud["_redial_pending"] is False


def test_worker_waits_long_enough_for_a_pending_redial():
    import inspect, app.main as main_mod

    src = inspect.getsource(main_mod)
    assert "shutdown_process_timeout=90.0" in src
    assert retry.REDIAL_DELAY_SECONDS < 90.0


@pytest.mark.asyncio
@pytest.mark.parametrize("status", ["cancelled", "completed", "picked_up", "no_show"])
async def test_redial_skipped_when_trip_no_longer_needs_a_call(status):
    """Live 2026-10-18: a trip cancelled during the 60 s wait was still redialled."""
    start = AsyncMock()
    res = await retry.redial_after_delay(
        _userdata()["customer_call"], 1, sleep=AsyncMock(), start_call=start,
        get_trip=AsyncMock(return_value={"status": status}),
    )
    assert res is None
    start.assert_not_awaited()


@pytest.mark.asyncio
async def test_redial_still_dials_when_trip_lookup_fails():
    start = AsyncMock(return_value={})
    res = await retry.redial_after_delay(
        _userdata()["customer_call"], 1, sleep=AsyncMock(), start_call=start,
        get_trip=AsyncMock(side_effect=RuntimeError("503")),
    )
    assert res is True
    start.assert_awaited_once()
