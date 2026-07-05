import logging

from livekit.agents import RunContext, function_tool

from app.rag import get_faq_rag_service
from app.voicebot.en.tools_definition import raw_schema

logger = logging.getLogger("voice-agent.en.tools.answer_app_faq")


@function_tool(raw_schema=raw_schema["answer_app_faq"])
async def answer_app_faq(raw_arguments: dict, context: RunContext) -> str:
    question = (raw_arguments.get("question") or "").strip()
    if not question:
        return "What would you like to know about the app or how to use a feature?"

    logger.info("answer_app_faq | question=%r", question)
    service = get_faq_rag_service()
    return await service.answer(question, language="en")
