import logging

from livekit.agents import RunContext, function_tool

from app.rag import get_faq_rag_service
from app.voicebot.processors import context_store
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.processors.tool_response_builders import build_faq_response

logger = logging.getLogger("voice-agent.en.tools.answer_app_faq")

_CLARIFY = "What would you like to know about the app or how to use a feature?"


@function_tool(raw_schema=raw_schema["answer_app_faq"])
async def answer_app_faq(raw_arguments: dict, context: RunContext) -> str:
    question = (raw_arguments.get("question") or "").strip()
    if not question:
        return await context_store.speak_and_stop(
            context.session,
            build_faq_response(_CLARIFY, lang="en"),
        )

    logger.info("answer_app_faq | question=%r", question)
    service = get_faq_rag_service()
    reply = await service.answer(question, language="en")
    return await context_store.speak_and_stop(
        context.session,
        build_faq_response(reply, lang="en", question=question),
    )
