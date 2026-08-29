"""Outbound call modes — resolve_call_mode + transfer_to_driver."""
import inspect

from app.voicebot.customer_call_agent import CustomerCallAgent
from app.voicebot.processors.call_mode import resolve_call_mode
from app.voicebot.tools import customer_call_tools


def test_resolve_call_mode_defaults_to_agent():
    assert resolve_call_mode("gọi khách giúp tôi", lang="vn") == "agent"
    assert resolve_call_mode("call the customer", lang="en") == "agent"


def test_resolve_call_mode_bridge_phrases():
    assert resolve_call_mode("gọi khách để tôi nói trực tiếp", lang="vn") == "bridge"
    assert resolve_call_mode("let me speak to the customer", lang="en") == "bridge"


def test_resolve_call_mode_background_phrases():
    assert resolve_call_mode("gọi nền giúp tôi", lang="vn") == "background"
    assert resolve_call_mode("call in the background", lang="en") == "background"


def test_resolve_call_mode_explicit_override():
    assert resolve_call_mode("anything", lang="vn", explicit="bridge") == "bridge"


def test_customer_call_agent_has_transfer_tool():
    src = inspect.getsource(CustomerCallAgent.__init__)
    assert "transfer_to_driver" in src


def test_transfer_to_driver_switches_to_bridge():
    src = inspect.getsource(customer_call_tools.transfer_to_driver)
    assert "enter_bridge_listen_mode" in src
    assert "restore_room_participant" in src
    assert "BridgeCallAgent" in src
    assert 'call_meta["mode"] = "bridge"' in src


def test_customer_call_prompt_mentions_transfer():
    from app.voicebot.prompts.customer_call import build_customer_call_prompt

    vn = build_customer_call_prompt(
        lang="vn",
        customer_name="An",
        driver_name="Bình",
        pickup_address="Q1",
        trip_id="t1",
    )
    en = build_customer_call_prompt(
        lang="en",
        customer_name="An",
        driver_name="Binh",
        pickup_address="Q1",
        trip_id="t1",
    )
    assert "transfer_to_driver" in vn
    assert "transfer_to_driver" in en
