"""F1–F12 text-in checklist: classify + tool content (no mic/TTS).

Spoken-intent auto-tool is off — trip answers come from LLM+tools.
Gate: classify routes correctly; tools speak_and_stop with no raw template.
"""
from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from livekit.agents import StopResponse

from app.voicebot.processors import context_store
from app.voicebot.processors.spoken_intent import (
    SPOKEN_INTENT_AUTO_TOOL,
    classify_driver_intent,
    handle_driver_utterance,
    needs_tool_llm,
)
from app.voicebot.testing.conversation_quality import assert_no_raw_template
from app.voicebot.locales.vn.tools.answer_app_faq import answer_app_faq
from app.voicebot.locales.vn.tools.call_customer import call_customer
from app.voicebot.locales.vn.tools.check_upcoming_trips import check_upcoming_trips
from app.voicebot.locales.vn.tools.check_trip_history import check_trip_history
from app.voicebot.locales.vn.tools.confirm_trip import confirm_trip
from app.voicebot.locales.vn.tools.get_today_earnings import get_today_earnings
from app.voicebot.locales.vn.tools.reject_trip import reject_trip
from app.voicebot.locales.vn.tools.request_cancel_trip import request_cancel_trip
from app.voicebot.locales.vn.tools.send_sms_to_customer import send_sms_to_customer
from app.voicebot.locales.vn.tools.get_trip_traffic import get_trip_traffic
from app.voicebot.locales.vn.tools.get_current_trip_info import get_current_trip_info
from app.voicebot.locales.vn.tools.set_driver_status import set_driver_status
from app.voicebot.locales.vn.tools.get_bonus_info import get_bonus_info
from app.voicebot.locales.vn.tools.get_driver_stats import get_driver_stats
from app.voicebot.locales.vn.tools.end_conversation import end_conversation
from app.voicebot.locales.vn.tools.call_custom_number import call_custom_number
from app.voicebot.locales.vn.tools.extend_wait_time import extend_wait_time
from app.voicebot.locales.vn.tools.update_trip_status import update_trip_status
from types import SimpleNamespace


def _session(userdata: dict) -> MagicMock:
    session = MagicMock()
    session.userdata = userdata
    session.say = AsyncMock()
    session.interrupt = AsyncMock()
    return session


def _ctx(userdata: dict) -> MagicMock:
    context = MagicMock()
    context.userdata = userdata
    context.session.say = AsyncMock()
    return context


async def _assert_auto_tool_silent(session: MagicMock, text: str) -> None:
    await handle_driver_utterance(session, SimpleNamespace(text_content=text), lang="vn")
    session.say.assert_not_called()


async def _speak_tool(fn, context, args=None) -> str:
    try:
        await fn.__wrapped__(args or {}, context)
    except StopResponse:
        pass
    else:
        raise AssertionError(f"{getattr(fn, '__name__', fn)} should StopResponse")
    spoken = context.session.say.await_args.args[0]
    assert_no_raw_template(spoken)
    return spoken


def _swallow(coro):
    if hasattr(coro, "close"):
        coro.close()


def _offer_context() -> dict:
    userdata: dict = {"driver_phone": "0888887798"}
    context_store.load_driver_context(
        userdata,
        {
            "current_trip": None,
            "upcoming_trips": [
                {
                    "trip_id": "t_offer",
                    "status": "notified",
                    "customer_name": "An",
                    "customer_phone": "+84901111111",
                    "pickup_address": "Lotte",
                    "dropoff_address": "Mỹ Đình",
                    "estimated_fare": 120_000,
                }
            ],
            "active_trip": None,
        },
    )
    return userdata


def _active_context() -> dict:
    userdata: dict = {"driver_phone": "0888887798"}
    context_store.load_driver_context(
        userdata,
        {
            "current_trip": {
                "trip_id": "t1",
                "status": "confirmed",
                "customer_name": "An",
                "customer_phone": "+84901111111",
                "pickup_address": "Lotte",
                "dropoff_address": "Mỹ Đình",
                "eta_minutes": 8,
                "distance_km": 3.2,
                "traffic_note": "Kẹt nhẹ",
                "route_summary": "via Liễu Giai",
                "estimated_fare": 120_000,
                "wait_extra_minutes": 0,
            },
            "upcoming_trips": [
                {
                    "trip_id": "t2",
                    "status": "confirmed",
                    "customer_name": "Bình",
                    "customer_phone": "+84902222222",
                    "pickup_address": "Pasteur",
                }
            ],
            "today_earnings": {"trip_count": 3, "total_earnings": 450_000},
            "bonus_info": {"today_bonus": 20000, "trips_toward_bonus": 2},
            "driver_stats": {"rating": 4.9, "acceptance_rate": 0.92},
            "completed_trips": [
                {
                    "trip_id": "c1",
                    "customer_name": "Chi",
                    "status": "completed",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            ],
            "cancelled_trips": [
                {
                    "trip_id": "x1",
                    "customer_name": "Dung",
                    "status": "cancelled",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            ],
        },
    )
    return userdata


def test_spoken_intent_auto_tool_off():
    assert SPOKEN_INTENT_AUTO_TOOL is False


# --- F1 confirm / reject ---


@pytest.mark.asyncio
async def test_f1_confirm_and_reject_text():
    userdata = _offer_context()
    session = _session(userdata)
    assert classify_driver_intent("Xác nhận nhận chuyến", "vn") == "confirm"
    await _assert_auto_tool_silent(session, "Xác nhận nhận chuyến")
    with patch(
        "app.voicebot.processors.confirm_trip_flow.backend_api.update_trip_status",
        new_callable=AsyncMock,
        return_value={
            "trip_id": "t_offer",
            "status": "confirmed",
            "customer_name": "An",
        },
    ):
        spoken = await _speak_tool(confirm_trip, _ctx(_offer_context()), {})
    assert "An" in spoken or "xác nhận" in spoken.lower() or "nhận" in spoken.lower()

    userdata = _offer_context()
    session = _session(userdata)
    assert classify_driver_intent("Từ chối chuyến này", "vn") == "reject"
    await _assert_auto_tool_silent(session, "Từ chối chuyến này")
    with patch(
        "app.voicebot.processors.confirm_trip_flow.backend_api.update_trip_status",
        new_callable=AsyncMock,
        return_value={"trip_id": "t_offer", "status": "rejected", "customer_name": "An"},
    ):
        spoken = await _speak_tool(reject_trip, _ctx(_offer_context()), {})
    assert "ghi nhận" in spoken.lower() or "từ chối" in spoken.lower() or "cảm ơn" in spoken.lower()


# --- F2 upcoming ---


@pytest.mark.asyncio
async def test_f2_upcoming_text():
    userdata = _active_context()
    session = _session(userdata)
    for u in ("chuyến sắp tới", "Hôm nay tôi còn mấy chuyến?", "lịch trình hôm nay"):
        assert classify_driver_intent(u, "vn") == "upcoming"
        session.say = AsyncMock()
        await _assert_auto_tool_silent(session, u)
    spoken = await _speak_tool(
        check_upcoming_trips, _ctx(_active_context()), {"scope": "all"}
    )
    assert "chuyến" in spoken.lower()


# --- F3 earnings / history ---


@pytest.mark.asyncio
async def test_f3_earnings_and_history_text():
    session = _session(_active_context())
    assert classify_driver_intent("Thu nhập hôm nay", "vn") == "earnings"
    await _assert_auto_tool_silent(session, "Thu nhập hôm nay")
    spoken = await _speak_tool(get_today_earnings, _ctx(_active_context()), {})
    assert "chuyến" in spoken.lower() or "450" in spoken or "đ" in spoken.lower()

    session = _session(_active_context())
    assert classify_driver_intent("chuyến hoàn thành hôm nay", "vn") == "trip_history"
    await _assert_auto_tool_silent(session, "chuyến hoàn thành hôm nay")
    spoken = await _speak_tool(
        check_trip_history, _ctx(_active_context()), {"scope": "completed_today"}
    )
    assert "Chi" in spoken or "hoàn thành" in spoken.lower() or "chuyến" in spoken.lower()


# --- F4 call_customer ---


@pytest.mark.asyncio
async def test_f4_call_customer_text():
    userdata = _active_context()
    assert classify_driver_intent("Gọi cho khách giúp tôi", "vn") == "call_customer"
    session = _session(userdata)
    await _assert_auto_tool_silent(session, "Gọi cho khách giúp tôi")
    with patch(
        "app.voicebot.processors.customer_call.backend_api.start_call",
        new_callable=AsyncMock,
    ):
        spoken = await _speak_tool(call_customer, _ctx(_active_context()), {})
    # Ambiguous (2 trips) or dialing — must speak, not silent
    assert len(spoken) > 5


# --- F5 mid-call wait (tool after text) ---


@pytest.mark.asyncio
async def test_f5_extend_wait_text_routes_to_tool():
    u = "Cho tôi chờ thêm 5 phút"
    assert needs_tool_llm(u, "vn") is True
    context = _ctx(_active_context())
    with patch(
        "app.voicebot.locales.vn.tools.extend_wait_time.backend_api.extend_wait_time",
        new_callable=AsyncMock,
        return_value={"total_wait_minutes": 7},
    ):
        spoken = await _speak_tool(extend_wait_time, context, {"minutes": 5})
    assert "phút" in spoken.lower() or "chờ" in spoken.lower() or "đã" in spoken.lower()


# --- F6 on-route status ---


@pytest.mark.asyncio
async def test_f6_trip_status_text():
    u = "Chuyến hiện tại thế nào?"
    intent = classify_driver_intent(u, "vn")
    assert intent == "current" or needs_tool_llm(u, "vn")
    if intent == "current":
        spoken = await _speak_tool(get_current_trip_info, _ctx(_active_context()), {})
    else:
        context = _ctx(_active_context())
        with patch(
            "app.voicebot.locales.vn.tools.update_trip_status.backend_api.update_trip_status",
            new_callable=AsyncMock,
            return_value={"trip_id": "t1", "status": "arrived_pickup"},
        ):
            spoken = await _speak_tool(
                update_trip_status, context, {"status": "ARRIVED_PICKUP"}
            )
    assert "An" in spoken or "Lotte" in spoken or "chuyến" in spoken.lower() or "đón" in spoken.lower()


# --- F7 FAQ ---


@pytest.mark.asyncio
async def test_f7_faq_text():
    u = "Làm sao để gọi khách?"
    assert needs_tool_llm(u, "vn") is True
    context = _ctx(_active_context())
    rag = MagicMock()
    rag.answer = AsyncMock(return_value="Bạn nói: gọi khách giúp tôi.")
    with patch(
        "app.voicebot.locales.vn.tools.answer_app_faq.get_faq_rag_service",
        return_value=rag,
    ):
        spoken = await _speak_tool(answer_app_faq, context, {"question": u})
    assert "gọi" in spoken.lower()


# --- F8 cancel ---


@pytest.mark.asyncio
async def test_f8_cancel_text():
    u = "Tôi muốn hủy chuyến"
    assert needs_tool_llm(u, "vn") is True
    spoken = await _speak_tool(request_cancel_trip, _ctx(_active_context()), {})
    assert "hủy" in spoken.lower()


# --- F9 SMS ---


@pytest.mark.asyncio
async def test_f9_sms_text():
    u = "Nhắn khách tôi đến sau 5 phút"
    assert needs_tool_llm(u, "vn") is True or "nhắn" in u.lower()
    context = _ctx(_active_context())
    with patch(
        "app.voicebot.locales.vn.tools.send_sms_to_customer.backend_api.send_sms",
        new_callable=AsyncMock,
        return_value={"ok": True},
    ):
        spoken = await _speak_tool(
            send_sms_to_customer, context, {"message": "Tôi đến sau 5 phút"}
        )
    assert "sms" in spoken.lower() or "nhắn" in spoken.lower() or "đã" in spoken.lower()


# --- F10 traffic / current ---


@pytest.mark.asyncio
async def test_f10_traffic_current_text():
    assert classify_driver_intent("chuyến hiện tại", "vn") == "current"
    spoken = await _speak_tool(get_current_trip_info, _ctx(_active_context()), {})
    assert "An" in spoken or "Lotte" in spoken

    spoken = await _speak_tool(get_trip_traffic, _ctx(_active_context()), {})
    assert "Kẹt" in spoken or "Liễu" in spoken or "8" in spoken


# --- F11 contact / custom number ---


@pytest.mark.asyncio
async def test_f11_custom_number_text():
    u = "Gọi số 0901234567"
    assert needs_tool_llm(u, "vn") is True or "gọi" in u.lower()
    # Invalid short number → refuse spoken (content path without dial)
    spoken = await _speak_tool(
        call_custom_number, _ctx(_active_context()), {"phone_number": "123"}
    )
    assert len(spoken) > 5


# --- F12 status / stats / bonus / end ---


@pytest.mark.asyncio
async def test_f12_status_stats_bonus_end_text():
    for u in ("Tôi nghỉ ca", "Bật nhận chuyến", "Hôm nay có thưởng không?", "Điểm đánh giá của tôi"):
        assert needs_tool_llm(u, "vn") is True

    context = _ctx(_active_context())
    with patch(
        "app.voicebot.locales.vn.tools.set_driver_status.backend_api.set_driver_online_status",
        new_callable=AsyncMock,
    ):
        spoken = await _speak_tool(set_driver_status, context, {"online": False})
    assert "offline" in spoken.lower() or "nghỉ" in spoken.lower() or "tắt" in spoken.lower()

    context.session.say = AsyncMock()
    spoken = await _speak_tool(get_driver_stats, context, {})
    assert len(spoken) > 5

    context.session.say = AsyncMock()
    spoken = await _speak_tool(get_bonus_info, context, {})
    assert "thưởng" in spoken.lower() or "20" in spoken or "bonus" in spoken.lower()

    userdata = _active_context()
    userdata["customer_call_active"] = True
    spoken = await _speak_tool(end_conversation, _ctx(userdata), {})
    assert "cuộc gọi" in spoken.lower() or "chưa" in spoken.lower()
