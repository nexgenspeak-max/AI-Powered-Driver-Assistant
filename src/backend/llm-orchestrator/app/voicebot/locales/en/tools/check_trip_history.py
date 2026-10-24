"""Completed / cancelled trips for today, yesterday or the last 7 days — from prefetched context."""
from livekit.agents import RunContext, function_tool

from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.processors import context_store
from app.voicebot.processors.trip_history_reply import build_history_reply


@function_tool(raw_schema=raw_schema["check_trip_history"])
async def check_trip_history(raw_arguments: dict, context: RunContext) -> str:
    reply = build_history_reply(context.userdata, raw_arguments, lang="en")
    return await context_store.speak_and_stop(context.session, reply)
