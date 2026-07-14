import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_NO_PENDING_CUSTOM_CALL
from app.voicebot.processors import custom_call

logger = logging.getLogger("voice-agent.vn.tools.confirm_call_custom_number")


@function_tool(raw_schema=raw_schema["confirm_call_custom_number"])
async def confirm_call_custom_number(raw_arguments: dict, context: RunContext):
    pending = context.userdata.get("pending_custom_call")
    if not pending or not pending.get("phone_number"):
        return ERR_NO_PENDING_CUSTOM_CALL

    context.userdata["pending_custom_call"] = None
    context.userdata["custom_call_count"] = context.userdata.get("custom_call_count", 0) + 1

    return await custom_call.start_bridge_call_to_number(
        context,
        pending["phone_number"],
        contact_name=pending.get("contact_name", ""),
        lang="vn",
    )
