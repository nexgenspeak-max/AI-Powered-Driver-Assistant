import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.en.constants import ERR_NO_ACTIVE_DRIVER
from app.voicebot.processors import context_store, customer_call

logger = logging.getLogger("voice-agent.en.tools.call_customer")


@function_tool(raw_schema=raw_schema["call_customer"])
async def call_customer(raw_arguments: dict, context: RunContext):
    mode = raw_arguments.get("mode", "bridge")
    current = context_store.get_current_trip(context.userdata)
    if not current:
        return ERR_NO_ACTIVE_DRIVER

    if mode == "agent":
        return await customer_call.start_in_room_agent_call(context, current, lang="en")
    if mode == "bridge":
        return await customer_call.start_in_room_bridge_call(context, current, lang="en")
    if mode == "background":
        return await customer_call.start_background_call(context, current, lang="en")

    return "Invalid call mode. Choose agent or bridge."
