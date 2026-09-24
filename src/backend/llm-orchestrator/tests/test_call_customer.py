"""call_customer: resolve trip, refuse self-call, speak errors, hand off agent."""
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from livekit.agents import Agent, StopResponse

from app.voicebot.processors import context_store
from app.voicebot.locales.vn.tools.call_customer import call_customer
from app.voicebot.testing.conversation_quality import assert_no_raw_template


def _ctx(userdata: dict) -> MagicMock:
    context = MagicMock()
    context.userdata = userdata
    context.session.say = AsyncMock()
    return context


async def _run(context, args):
    try:
        return await call_customer.__wrapped__(args, context)
    except StopResponse:
        return "stopped"


def _two_trips(*, same_phone_as_driver: bool = False) -> dict:
    userdata: dict = {
        "driver_phone": "0888887798",
        "room_name": "driver-0888887798-test",
        "context": {},
    }
    phone_a = "0888887798" if same_phone_as_driver else "+84901111111"
    context_store.load_driver_context(
        userdata,
        {
            "upcoming_trips": [
                {
                    "trip_id": "t1",
                    "status": "confirmed",
                    "customer_name": "An",
                    "customer_phone": phone_a,
                    "pickup_address": "Lotte",
                },
                {
                    "trip_id": "t2",
                    "status": "confirmed",
                    "customer_name": "Bình",
                    "customer_phone": "+84902222222",
                    "pickup_address": "Pasteur",
                },
            ]
        },
    )
    return userdata


@pytest.mark.asyncio
async def test_call_customer_ambiguous_speaks_without_dial():
    context = _ctx(_two_trips())
    with patch(
        "app.voicebot.processors.customer_call.backend_api.start_call",
        new_callable=AsyncMock,
    ) as dial:
        result = await _run(context, {"mode": "agent"})
    assert result == "stopped"
    dial.assert_not_awaited()
    spoken = context.session.say.await_args.args[0]
    assert_no_raw_template(spoken)
    assert "An" in spoken or "Bình" in spoken or "nhiều" in spoken.lower()


@pytest.mark.asyncio
async def test_call_customer_self_call_blocked():
    context = _ctx(_two_trips(same_phone_as_driver=True))
    with patch(
        "app.voicebot.processors.customer_call.backend_api.start_call",
        new_callable=AsyncMock,
    ) as dial:
        result = await _run(context, {"mode": "agent", "trip_index": 1})
    assert result == "stopped"
    dial.assert_not_awaited()
    spoken = context.session.say.await_args.args[0]
    assert "trùng số" in spoken.lower() or "tài xế" in spoken.lower()


@pytest.mark.asyncio
async def test_call_customer_agent_handoff_tuple():
    userdata = _two_trips()
    context = _ctx(userdata)
    fake_agent = MagicMock(spec=Agent)

    with patch(
        "app.voicebot.locales.vn.tools.call_customer.customer_call.start_in_room_agent_call",
        new_callable=AsyncMock,
        return_value=(fake_agent, ""),
    ):
        result = await call_customer.__wrapped__(
            {"mode": "agent", "trip_index": 1}, context
        )

    assert result == (fake_agent, "")
    context.session.say.assert_not_called()


@pytest.mark.asyncio
async def test_call_customer_no_trips_speaks():
    userdata: dict = {"driver_phone": "0888887798", "room_name": "r", "context": {}}
    context_store.load_driver_context(userdata, {"upcoming_trips": []})
    context = _ctx(userdata)
    result = await _run(context, {"mode": "agent"})
    assert result == "stopped"
    assert context.session.say.await_args.args[0]
