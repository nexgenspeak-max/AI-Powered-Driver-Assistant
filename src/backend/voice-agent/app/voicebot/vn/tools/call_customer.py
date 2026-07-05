import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_NO_ACTIVE_DRIVER
from app.voicebot.processors import context_store, customer_call

logger = logging.getLogger("voice-agent.vn.tools.call_customer")


@function_tool(raw_schema=raw_schema["call_customer"])
async def call_customer(raw_arguments: dict, context: RunContext):
    mode = raw_arguments.get("mode", "bridge")
    current = context_store.get_current_trip(context.userdata)
    if not current:
        return ERR_NO_ACTIVE_DRIVER

    if mode == "agent":
        return await customer_call.start_in_room_agent_call(context, current, lang="vn")
    if mode == "bridge":
        return await customer_call.start_in_room_bridge_call(context, current, lang="vn")
    if mode == "background":
        return await customer_call.start_background_call(context, current, lang="vn")

    return "Chế độ gọi không hợp lệ. Chọn agent hoặc bridge."
