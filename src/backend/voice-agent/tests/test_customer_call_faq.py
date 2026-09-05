"""Customer-call FAQ must return text for the LLM — never speak_and_stop."""
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.voicebot.prompts.customer_call import build_customer_call_prompt
from app.voicebot.tools.customer_call_tools import answer_customer_faq


def test_prompt_includes_trip_facts_and_faq_tool_guidance():
    trip = {
        "trip_id": "t-1",
        "pickup_address": "Lotte Liễu Giai",
        "dropoff_address": "Chợ Bến Thành",
        "eta_minutes": 12,
        "distance_km": 4.5,
        "estimated_fare": 69000,
    }
    text = build_customer_call_prompt(
        lang="vn",
        customer_name="An",
        driver_name="Bình",
        pickup_address=trip["pickup_address"],
        trip_id=trip["trip_id"],
        trip=trip,
    )
    assert "Chợ Bến Thành" in text
    assert "12" in text
    assert "answer_customer_faq" in text
    assert "record_customer_request" in text
    assert "không bịa" in text.lower() or "không đoán" in text


def test_contact_prompt_omits_trip_facts():
    text = build_customer_call_prompt(
        lang="vn",
        customer_name="Bạn",
        driver_name="Bình",
        pickup_address="",
        trip_id="",
        trip={},
    )
    assert "Thông tin chuyến đã biết" not in text
    assert "Giá ước tính" not in text


@pytest.mark.asyncio
async def test_answer_customer_faq_returns_text_without_saying():
    session = MagicMock()
    session.say = AsyncMock()
    ctx = SimpleNamespace(userdata={"lang": "vn"}, session=session)

    with patch(
        "app.voicebot.tools.customer_call_tools.get_faq_rag_service"
    ) as get_svc:
        svc = MagicMock()
        svc.answer = AsyncMock(return_value="Hủy trên app hoặc nhờ AI xác nhận.")
        get_svc.return_value = svc
        # function_tool wraps the coroutine — call underlying if present
        fn = getattr(answer_customer_faq, "__wrapped__", answer_customer_faq)
        result = await fn(ctx, question="Làm sao hủy chuyến?")

    assert "Hủy trên app" in result
    assert "diễn đạt" in result.lower() or "FAQ" in result
    session.say.assert_not_called()
    svc.answer.assert_awaited()


@pytest.mark.asyncio
async def test_answer_customer_faq_empty_question():
    ctx = SimpleNamespace(userdata={"lang": "vn"}, session=MagicMock())
    fn = getattr(answer_customer_faq, "__wrapped__", answer_customer_faq)
    result = await fn(ctx, question="  ")
    assert "Thiếu" in result or "câu hỏi" in result.lower()
