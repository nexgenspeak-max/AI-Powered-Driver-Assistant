"""Registered vehicle (type, plate, name) — read from the prefetched context (driver)."""
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.locales.vn.tools.get_vehicle_info import build_vehicle_response
from app.voicebot.processors import context_store


@function_tool(raw_schema=raw_schema["get_vehicle_info"])
async def get_vehicle_info(raw_arguments: dict, context: RunContext) -> str:
    driver = context_store.get(context.userdata, "driver", {}) or {}
    reply = build_vehicle_response(driver, lang="en")
    context_store.set_last_tool_response(context.userdata, reply)
    await context_store.speak_reply(context.session, reply, lang="en")
