"""Inbound connect greeting — filler then schedule context."""
import inspect

from app.voicebot.processors.context_store import load_driver_context
from app.voicebot.processors.driver_greeting import build_inbound_context_greeting
from app.voicebot.vn.agent import DriverAgent
from app.voicebot.vn.constants import GREETING_AFTER_PREFETCH, GREETING_CONNECT_FILLER


def test_connect_filler_wording():
    assert GREETING_CONNECT_FILLER == "Chào bạn, tôi là Czen, trợ lý AI của bạn."
    assert "Czen" in GREETING_CONNECT_FILLER
    assert "trợ lý AI" in GREETING_CONNECT_FILLER


def test_after_prefetch_wording():
    assert GREETING_AFTER_PREFETCH == "Tôi có thể giúp gì cho bạn?"


def test_inbound_greeting_speaks_filler_then_help_prompt():
    src = inspect.getsource(DriverAgent._speak_inbound_greeting)
    assert "GREETING_CONNECT_FILLER" in src
    assert "GREETING_AFTER_PREFETCH" in src
    assert "build_inbound_context_greeting" not in src


def test_speak_after_sip_pickup_waits_for_in_app_audio():
    from app.voicebot.processors.sip_call_watch import speak_after_sip_pickup

    src = inspect.getsource(speak_after_sip_pickup)
    assert "wait_for_in_app_audio_ready" in src


def test_context_greeting_with_active_trip():
    userdata = {}
    load_driver_context(userdata, {
        "current_trip": {
            "customer_name": "An",
            "pickup_address": "Chợ Bến Thành",
            "dropoff_address": "Sân bay Tân Sơn Nhất",
            "status": "confirmed",
        },
    })
    msg = build_inbound_context_greeting(userdata, lang="vi")
    assert "đang có chuyến" in msg
    assert "An" in msg


def test_context_greeting_with_schedule():
    userdata = {}
    load_driver_context(userdata, {
        "upcoming_trips": [
            {"trip_id": "t1"},
            {"trip_id": "t2"},
            {"trip_id": "t3"},
        ],
    })
    msg = build_inbound_context_greeting(userdata, lang="vi")
    assert "3 chuyến hôm nay" in msg
