"""Driver cancels a ringing AI call by typing (or the app's Huỷ cuộc gọi button)."""
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.voicebot.processors import call_cancel


@pytest.mark.parametrize("text", ["Thôi", "Thôi, chưa cần đâu.", "Huỷ cuộc gọi", "hủy cuộc gọi đi", "Không gọi nữa", "cúp máy đi"])
def test_vietnamese_cancel_phrases(text):
    assert call_cancel.is_cancel_request(text, "vn")


@pytest.mark.parametrize("text", ["Gọi cho khách giúp tôi", "Khách nói gì vậy?", ""])
def test_not_cancel(text):
    assert not call_cancel.is_cancel_request(text, "vn")


def test_english_cancel_phrases():
    assert call_cancel.is_cancel_request("cancel the call", "en")
    assert call_cancel.is_cancel_request("Never mind", "en")
    assert not call_cancel.is_cancel_request("call the customer", "en")


@pytest.mark.asyncio
async def test_no_call_in_progress_does_nothing():
    sess = SimpleNamespace(userdata={"customer_call_active": False})
    assert not await call_cancel.maybe_cancel_active_call(sess, "Thôi", "vn")


@pytest.mark.asyncio
async def test_cancel_hands_back_then_hangs_up():
    order = []
    userdata = {"customer_call_active": True, "customer_call": {"mode": "agent"}, "_silence_tracker": MagicMock()}
    sess = SimpleNamespace(userdata=userdata)

    async def fake_handback(session, ud, summary, *, mode, silence_tracker=None):
        order.append(("handback", summary, mode))
        ud["customer_call_active"] = False

    async def fake_hangup(ud):
        order.append(("hangup", ud["customer_call_active"]))

    with patch("app.voicebot.processors.handback.handback_to_driver", side_effect=fake_handback), \
         patch("app.voicebot.processors.handback.disconnect_sip_participant", side_effect=fake_hangup), \
         patch("app.voicebot.processors.sip_call_watch.cancel_no_answer_watch") as no_ans, \
         patch("app.voicebot.processors.agent_call_silence.cancel_agent_call_silence_watch") as sil:
        assert await call_cancel.maybe_cancel_active_call(sess, "Huỷ cuộc gọi", "vn")
    assert order == [("handback", call_cancel.CANCELLED_VN, "agent"), ("hangup", False)]
    no_ans.assert_called_once()
    sil.assert_called_once()


@pytest.mark.asyncio
async def test_typed_cancel_short_circuits_the_llm():
    from app.voicebot.processors.spoken_intent import driver_text_input_cb

    sess = MagicMock()
    sess.userdata = {"customer_call_active": True}
    sess.current_agent = MagicMock(_spoken_intent_lang="vn")
    with patch("app.voicebot.processors.call_cancel.maybe_cancel_active_call", new=AsyncMock(return_value=True)) as m:
        await driver_text_input_cb(sess, SimpleNamespace(text="Thôi"))
    m.assert_awaited_once()
    sess.generate_reply.assert_not_called()


def test_session_listens_on_the_call_control_topic():
    import inspect
    from app.agent import session as sess_mod

    src = inspect.getsource(sess_mod)
    assert "CALL_CONTROL_TOPIC" in src and "cancel_active_call" in src
    assert call_cancel.CALL_CONTROL_TOPIC == "call_control"


@pytest.mark.asyncio
async def test_unanswered_teardown_skips_a_call_the_driver_already_cancelled():
    from app.voicebot.processors import sip_call_watch

    userdata = {"customer_call_active": False, "bridge_call_active": False, "customer_call": {"mode": "agent"}}
    with patch.object(sip_call_watch, "disconnect_sip_participant", new=AsyncMock()) as hang, \
         patch("app.voicebot.processors.handback.handback_to_driver", new=AsyncMock()) as hb:
        await sip_call_watch.teardown_unanswered_call(MagicMock(), userdata)
    hang.assert_not_awaited()
    hb.assert_not_awaited()
