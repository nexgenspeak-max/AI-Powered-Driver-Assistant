import logging

from livekit.agents import RunContext, function_tool

from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_NO_PENDING_CONTACT_CALL
from app.voicebot.processors import custom_call, contact_call

logger = logging.getLogger("voice-agent.vn.tools.confirm_contact_call")


@function_tool(raw_schema=raw_schema["confirm_contact_call"])
async def confirm_contact_call(raw_arguments: dict, context: RunContext):
    pending = context.userdata.get("pending_contact_call")
    if not pending or not pending.get("phone_number"):
        return ERR_NO_PENDING_CONTACT_CALL

    context.userdata["pending_contact_call"] = None

    mode = raw_arguments.get("mode") or "bridge"
    name = pending.get("name", "")
    phone_number = pending["phone_number"]

    if mode == "agent":
        message = (raw_arguments.get("message") or "").strip()
        return await contact_call.start_agent_call_to_contact(
            context, phone_number, contact_name=name, custom_message=message, lang="vn",
        )

    return await custom_call.start_bridge_call_to_number(
        context, phone_number, contact_name=name, lang="vn",
    )
