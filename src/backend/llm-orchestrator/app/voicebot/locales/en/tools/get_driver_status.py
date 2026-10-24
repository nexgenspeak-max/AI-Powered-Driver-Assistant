"""Current availability (online/offline) — read from the prefetched context (driver)."""
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.locales.vn.tools.get_driver_status import build_driver_status_response
from app.voicebot.processors import context_store


@function_tool(raw_schema=raw_schema["get_driver_status"])
async def get_driver_status(raw_arguments: dict, context: RunContext) -> str:
    driver = context_store.get(context.userdata, "driver", {}) or {}
    reply = build_driver_status_response(driver, lang="en")
    context_store.set_last_tool_response(context.userdata, reply)
    await context_store.speak_reply(context.session, reply, lang="en")
