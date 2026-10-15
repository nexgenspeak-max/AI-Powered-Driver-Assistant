"""FR-A02: in bridge mode the agent stays silent and only ends the call on a driver wake phrase."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.voicebot.bridge_call_agent import BridgeCallAgent
from app.voicebot.prompts.bridge_call import WAKE_PHRASES_EN, WAKE_PHRASES_VI, build_bridge_instructions
from app.voicebot.tools import bridge_call_tools
from app.voicebot.tools.bridge_call_tools import end_bridge_call


def test_bridge_agent_exposes_only_end_tool():
    agent = BridgeCallAgent(lang="vn", customer_name="An")
    names = [getattr(t, "name", None) or getattr(getattr(t, "info", None), "name", None) for t in agent.tools]
    assert names == ["end_bridge_call"]


@pytest.mark.parametrize("lang,phrases", [("vn", WAKE_PHRASES_VI), ("en", WAKE_PHRASES_EN)])
def test_instructions_list_every_wake_phrase(lang, phrases):
    text = build_bridge_instructions(lang)
    for phrase in phrases:
        assert phrase in text


@pytest.mark.asyncio
async def test_end_bridge_call_hangs_up_and_returns_to_driver_agent():
    userdata = {"lang": "vn", "customer_call_active": True, "bridge_call_active": True}
    ctx = MagicMock()
    ctx.userdata = userdata
    driver_agent = object()
    with patch.object(bridge_call_tools, "cancel_bridge_timeout") as cancel, \
         patch.object(bridge_call_tools, "store_call_summary", new_callable=AsyncMock) as store, \
         patch.object(bridge_call_tools, "restore_session_audio") as restore, \
         patch.object(bridge_call_tools, "disconnect_sip_participant", new_callable=AsyncMock) as hangup, \
         patch.object(bridge_call_tools, "build_driver_agent", return_value=driver_agent):
        fn = getattr(end_bridge_call, "__wrapped__", end_bridge_call)
        agent, _ = await fn(ctx, summary="")
    cancel.assert_called_once()
    hangup.assert_awaited_once()
    restore.assert_called_once()
    assert store.await_args.args[1] == "Tài xế yêu cầu kết thúc cuộc gọi trực tiếp."
    assert userdata["customer_call_active"] is False and userdata["bridge_call_active"] is False
    assert agent is driver_agent
