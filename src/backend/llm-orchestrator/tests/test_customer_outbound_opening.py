"""Outbound customer-call first audio must not wait on a stacked silence + LLM."""
import inspect

from app.voicebot.customer_call_agent import CustomerCallAgent
from app.voicebot.processors.prefetch import prefetch_role
from app.voicebot.processors.sip_call_watch import (
    _DEFAULT_POST_ANSWER_DELAY,
    wait_for_sip_pickup,
)
from app.voicebot.prompts.customer_call import build_customer_call_opening


def test_prefetch_skipped_for_isolated_outbound():
    assert prefetch_role("custcall") is None
    assert prefetch_role("customer") == "customer"
    assert prefetch_role("driver") == "driver"


def test_post_answer_delay_is_sub_second():
    assert _DEFAULT_POST_ANSWER_DELAY == 0.6
    assert _DEFAULT_POST_ANSWER_DELAY < 1.0
    sig = inspect.signature(wait_for_sip_pickup)
    assert sig.parameters["post_answer_delay"].default == _DEFAULT_POST_ANSWER_DELAY


def test_opening_is_canned_not_llm_and_mentions_custom_message():
    text = build_customer_call_opening(
        lang="vn",
        trip_id="t1",
        pickup_address="Chợ Bến Thành",
        custom_message="tôi đến trong 5 phút",
    )
    assert "tôi đến trong 5 phút" in text
    assert "Xin chào" in text


def test_contact_opening_does_not_mention_pickup():
    text = build_customer_call_opening(lang="vn", trip_id="", pickup_address="should-not-appear")
    assert "đón" not in text
    assert "should-not-appear" not in text


def test_isolated_flow_has_no_extra_sleep_after_pickup():
    source = inspect.getsource(CustomerCallAgent._run_isolated_answer_flow)
    assert "asyncio.sleep" not in source
    speak_src = inspect.getsource(CustomerCallAgent._speak_opening_if_needed)
    assert "generate_reply(" not in speak_src
    assert "session.say" in speak_src


def test_sip_identity_reads_driver_outbound_slot():
    from app.voicebot.processors.sip_call_watch import sip_identity_of

    assert sip_identity_of({}) == ""
    assert sip_identity_of({"sip_identity": "driver-84900000001"}) == "driver-84900000001"
    assert sip_identity_of({
        "customer_call": {"sip_identity": "customer-1"},
        "sip_identity": "driver-2",
    }) == "customer-1"


def test_driver_opening_waits_for_sip_before_say():
    from app.voicebot.locales.vn.agent import DriverAgent
    from app.voicebot.locales.en.agent import DriverAgent as EnDriverAgent
    from app.voicebot.processors.sip_call_watch import speak_after_sip_pickup

    vn = inspect.getsource(DriverAgent.on_enter)
    en = inspect.getsource(EnDriverAgent.on_enter)
    assert "speak_after_sip_pickup" in vn
    assert "speak_after_sip_pickup" in en
    opening = inspect.getsource(speak_after_sip_pickup)
    assert "wait_for_sip_pickup" in opening
    assert opening.count("set_participant") >= 2
