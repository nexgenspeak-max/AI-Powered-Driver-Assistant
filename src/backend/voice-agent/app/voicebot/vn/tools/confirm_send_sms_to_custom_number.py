import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_NO_PENDING_CUSTOM_SMS, ERR_SMS_SEND_FAILED
from app.services import backend_api

logger = logging.getLogger("voice-agent.vn.tools.confirm_send_sms_to_custom_number")


@function_tool(raw_schema=raw_schema["confirm_send_sms_to_custom_number"])
async def confirm_send_sms_to_custom_number(raw_arguments: dict, context: RunContext) -> str:
    pending = context.userdata.get("pending_custom_sms")
    if not pending or not pending.get("phone_number"):
        return ERR_NO_PENDING_CUSTOM_SMS

    context.userdata["pending_custom_sms"] = None

    try:
        await backend_api.send_sms(pending["message"], phone_number=pending["phone_number"])
    except Exception:
        logger.error("confirm_send_sms_to_custom_number API failed", exc_info=True)
        return ERR_SMS_SEND_FAILED

    who = pending.get("contact_name") or "số đó"
    return f"Đã gửi tin nhắn tới {who}."
