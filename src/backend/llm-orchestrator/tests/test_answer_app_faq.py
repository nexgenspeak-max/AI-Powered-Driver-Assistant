"""answer_app_faq must speak the RAG reply — a second LLM pass can stay silent.

Live 2026-08-29: driver asked “bạn cung cấp những dịch vụ nào”. FAQ returned a
full sentence, then Luna's rewrite was 3 tokens and the agent went
thinking→listening with no TTS.
"""
from unittest.mock import AsyncMock, MagicMock, patch

from livekit.agents import StopResponse

from app.voicebot.locales.en.tools.answer_app_faq import answer_app_faq as answer_app_faq_en
from app.voicebot.locales.vn.tools.answer_app_faq import answer_app_faq as answer_app_faq_vn


async def _run(fn, args, context):
    try:
        await fn.__wrapped__(args, context)
    except StopResponse:
        return
    raise AssertionError("answer_app_faq should StopResponse after speaking")


def _context():
    context = MagicMock()
    context.userdata = {}
    context.session.say = AsyncMock()
    return context


async def test_vn_faq_speaks_rag_reply_and_stops_llm_rewrite():
    context = _context()
    reply = (
        "Ứng dụng hỗ trợ đặt xe, theo dõi chuyến, và cung cấp trợ lý giọng nói."
    )
    with patch(
        "app.voicebot.locales.vn.tools.answer_app_faq.get_faq_rag_service"
    ) as get_svc:
        get_svc.return_value.answer = AsyncMock(return_value=reply)
        await _run(answer_app_faq_vn, {"question": "Bạn cung cấp những dịch vụ nào?"}, context)

    context.session.say.assert_awaited_once()
    assert context.session.say.await_args.args[0] == reply


async def test_vn_empty_question_speaks_clarification():
    context = _context()
    await _run(answer_app_faq_vn, {"question": "  "}, context)
    spoken = context.session.say.await_args.args[0]
    assert "tính năng" in spoken or "cách dùng" in spoken


async def test_en_faq_speaks_rag_reply_and_stops_llm_rewrite():
    context = _context()
    reply = "The app helps with bookings, trip tracking, and a voice assistant."
    with patch(
        "app.voicebot.locales.en.tools.answer_app_faq.get_faq_rag_service"
    ) as get_svc:
        get_svc.return_value.answer = AsyncMock(return_value=reply)
        await _run(answer_app_faq_en, {"question": "What services do you provide?"}, context)

    context.session.say.assert_awaited_once()
    assert context.session.say.await_args.args[0] == reply
