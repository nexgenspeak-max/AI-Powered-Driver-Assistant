import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.locales.en.constants import ERR_DRIVER_STATUS_FAIL
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_response_builders import (
    build_driver_status_response,
    build_mutation_response,
)

logger = logging.getLogger("llm-orchestrator.en.tools.set_driver_status")


@function_tool(raw_schema=raw_schema["set_driver_status"])
async def set_driver_status(raw_arguments: dict, context: RunContext) -> str:
    online = bool(raw_arguments.get("online", True))
    driver_phone = context.userdata["driver_phone"]

    try:
        await backend_api.set_driver_online_status(driver_phone, online)
    except Exception:
        logger.error("set_driver_status API failed", exc_info=True)
        return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
                ERR_DRIVER_STATUS_FAIL,
                tool="set_driver_status",
                lang="en",
            ),
        )

    context_store.set_driver_status(context.userdata, online)
    resp = build_driver_status_response(online, lang="en")
    return await context_store.speak_and_stop(context.session, resp)
