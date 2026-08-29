"""No-answer outbound calls must hang up and clear in_progress within ~20s."""
from __future__ import annotations

import asyncio
import inspect
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.voicebot.customer_call_agent import CustomerCallAgent
from app.voicebot.processors.sip_call_watch import (
    DEFAULT_RING_TIMEOUT_SECONDS,
    cancel_no_answer_watch,
    schedule_no_answer_watch,
    teardown_unanswered_call,
    wait_for_sip_pickup,
)


def test_ring_timeout_default_is_twenty_seconds():
    sig = inspect.signature(wait_for_sip_pickup)
    assert sig.parameters["answer_timeout"].default == DEFAULT_RING_TIMEOUT_SECONDS
    assert DEFAULT_RING_TIMEOUT_SECONDS == 20.0


def test_agents_tear_down_on_unconfirmed_pickup():
    agent_src = inspect.getsource(CustomerCallAgent.on_enter)
    isolated_src = inspect.getsource(CustomerCallAgent._run_isolated_answer_flow)
    assert "teardown_unanswered_call" in agent_src
    assert "teardown_unanswered_call" in isolated_src
    assert "staying silent" not in agent_src
    assert "staying silent" not in isolated_src


@pytest.mark.asyncio
async def test_teardown_unanswered_isolated_call():
    session = MagicMock()
    userdata = {
        "lang": "vn",
        "isolated_call": True,
        "customer_call": {"call_id": "c1", "mode": "background"},
        "driver_phone": "0888887798",
    }

    with patch(
        "app.voicebot.processors.sip_call_watch.disconnect_sip_participant",
        new_callable=AsyncMock,
    ) as disconnect, patch(
        "app.voicebot.processors.sip_call_watch.complete_isolated_call",
        new_callable=AsyncMock,
    ) as complete:
        await teardown_unanswered_call(session, userdata)

    disconnect.assert_awaited_once()
    complete.assert_awaited_once()
    summary = complete.call_args[0][2]
    assert "Không gọi được" in summary or "Không kết nối" in summary


@pytest.mark.asyncio
async def test_teardown_skipped_after_pickup():
    session = MagicMock()
    userdata = {
        "lang": "vn",
        "customer_call_active": True,
        "customer_call": {"mode": "agent"},
        "_agent_call_answered": True,
    }

    with patch(
        "app.voicebot.processors.sip_call_watch.disconnect_sip_participant",
        new_callable=AsyncMock,
    ) as disconnect, patch(
        "app.voicebot.processors.sip_call_watch.handback_to_driver",
        new_callable=AsyncMock,
    ) as handback:
        await teardown_unanswered_call(session, userdata)

    disconnect.assert_not_awaited()
    handback.assert_not_awaited()


@pytest.mark.asyncio
async def test_no_answer_watch_fires_teardown():
    session = MagicMock()
    userdata = {
        "lang": "vn",
        "customer_call_active": True,
        "customer_call": {"mode": "agent", "call_id": "c2"},
        "_dial_started_at": 0.0,
    }

    with patch(
        "app.voicebot.processors.sip_call_watch.teardown_unanswered_call",
        new_callable=AsyncMock,
    ) as teardown, patch("app.voicebot.processors.sip_call_watch.time") as mock_time:
        mock_time.time.return_value = DEFAULT_RING_TIMEOUT_SECONDS
        schedule_no_answer_watch(session, userdata, timeout=DEFAULT_RING_TIMEOUT_SECONDS)
        await asyncio.sleep(0.05)

    teardown.assert_awaited_once_with(session, userdata)


def test_cancel_no_answer_watch_prevents_pending_task():
    task = MagicMock()
    task.done.return_value = False
    userdata = {"_no_answer_watch_task": task}

    cancel_no_answer_watch(userdata)

    task.cancel.assert_called_once()
    assert "_no_answer_watch_task" not in userdata
