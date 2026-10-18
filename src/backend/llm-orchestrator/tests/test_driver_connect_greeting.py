"""Inbound connect greeting — filler, then a one-line schedule snapshot."""
import inspect

from app.voicebot.processors.context_store import load_driver_context
from app.voicebot.processors.driver_greeting import build_inbound_context_greeting
from app.voicebot.locales.vn.agent import DriverAgent
from app.voicebot.locales.vn.constants import (
    GREETING_AFTER_PREFETCH,
    GREETING_CONNECT_FILLER,
    SILENCE_CHECK_IN,
    SILENCE_GOODBYE,
)
from app.voicebot.testing.conversation_quality import assert_tts_safe_vn


def test_connect_filler_wording():
    assert GREETING_CONNECT_FILLER == "Chào bạn, mình là Czen, trợ lý AI của bạn."
    assert "Czen" in GREETING_CONNECT_FILLER
    assert "trợ lý AI" in GREETING_CONNECT_FILLER


def test_persona_is_consistent_across_fixed_lines():
    """Czen says "mình" everywhere — never "tôi"/"em" in one line and "mình" in the next."""
    for line in (GREETING_CONNECT_FILLER, GREETING_AFTER_PREFETCH, SILENCE_CHECK_IN, SILENCE_GOODBYE):
        lowered = f" {line.lower()} "
        assert " tôi " not in lowered, line
        assert " em " not in lowered, line
        assert_tts_safe_vn(line)


def test_after_prefetch_wording():
    assert GREETING_AFTER_PREFETCH == "Cần gì bạn cứ nói nhé."


def test_silence_goodbye_is_short_and_signs_off():
    # Must contain a farewell marker (session.py's _GOODBYE_MARKERS) and stay
    # under ~3s of TTS — the old 85-char line ran 5s.
    assert "tạm biệt" in SILENCE_GOODBYE.lower()
    assert len(SILENCE_GOODBYE) <= 60


def test_inbound_greeting_speaks_filler_then_context_snapshot():
    src = inspect.getsource(DriverAgent._speak_inbound_greeting)
    assert "GREETING_CONNECT_FILLER" in src
    assert "GREETING_AFTER_PREFETCH" in src
    assert "build_inbound_context_greeting" in src


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
    assert "chuyến nữa" not in msg  # nothing else scheduled


def test_context_greeting_with_active_trip_and_more_scheduled():
    userdata = {}
    load_driver_context(userdata, {
        "current_trip": {"trip_id": "t1", "customer_name": "An", "status": "confirmed"},
        "upcoming_trips": [
            {"trip_id": "t1", "customer_name": "An", "status": "confirmed"},
            {"trip_id": "t2"},
            {"trip_id": "t3"},
        ],
    })
    msg = build_inbound_context_greeting(userdata, lang="vi")
    assert "An" in msg
    assert "2 chuyến nữa" in msg


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


def test_context_greeting_no_trips_uses_minh_persona():
    userdata = {}
    load_driver_context(userdata, {})
    msg = build_inbound_context_greeting(userdata, lang="vi")
    assert msg
    assert " em " not in f" {msg.lower()} "


def test_outbound_offer_reads_fare_distance_and_asks():
    agent = DriverAgent(trip={
        "trip_id": "t9",
        "customer_name": "Bình",
        "pickup_address": "54 Liễu Giai, Ba Đình, Hà Nội",
        "dropoff_address": "Sân bay Nội Bài, Sóc Sơn, Hà Nội",
        "estimated_fare": 250000,
        "distance_km": 28.4,
        "eta_minutes": 41,
        "traffic_note": "Giao thông thông thoáng",
    })
    msg = agent._build_outbound_greeting()
    assert "Czen" in msg
    assert "Bình" in msg
    assert "250.000đ" in msg
    assert "28.4 km" in msg and "41 phút" in msg
    # "thông thoáng" adds nothing for an accept/reject decision — only
    # congestion notes are read out.
    assert "thông thoáng" not in msg
    assert msg.endswith("Bạn nhận chuyến này không?")
    assert_tts_safe_vn(msg)


class _Room:
    def __init__(self, identities):
        self.remote_participants = {i: type("P", (), {"identity": i})() for i in identities}


class _Session:
    def __init__(self, room):
        self.agent_state = "listening"
        self.room_io = object()
        self.userdata = {"_job_ctx": type("Ctx", (), {"room": room})()}


def test_in_app_audio_ready_waits_for_driver_to_join():
    import asyncio
    from app.voicebot.processors.sip_call_watch import wait_for_in_app_audio_ready

    room = _Room([])

    async def run():
        async def join_later():
            await asyncio.sleep(0.3)
            room.remote_participants["driver-1"] = type("P", (), {"identity": "driver-1"})()

        joiner = asyncio.create_task(join_later())
        t0 = asyncio.get_running_loop().time()
        await wait_for_in_app_audio_ready(_Session(room), participant_timeout=3, post_ready_delay=0)
        await joiner
        return asyncio.get_running_loop().time() - t0

    waited = asyncio.run(run())
    assert 0.25 <= waited < 2


def test_in_app_audio_ready_ignores_other_agents_and_times_out():
    import asyncio
    from app.voicebot.processors.sip_call_watch import wait_for_in_app_audio_ready

    async def run():
        t0 = asyncio.get_running_loop().time()
        await wait_for_in_app_audio_ready(
            _Session(_Room(["agent-AJ_x"])), participant_timeout=0.3, post_ready_delay=0
        )
        return asyncio.get_running_loop().time() - t0

    assert 0.25 <= asyncio.run(run()) < 1.5


def test_nudge_sessions_wait_for_driver_before_speaking():
    import inspect
    from app.voicebot.locales.vn import agent as vn_agent
    from app.voicebot.locales.en import agent as en_agent

    for mod in (vn_agent, en_agent):
        src = inspect.getsource(mod)
        nudge_at = src.index("await speak_nudges(")
        assert "await wait_for_in_app_audio_ready(self.session)" in src[nudge_at - 600:nudge_at]
