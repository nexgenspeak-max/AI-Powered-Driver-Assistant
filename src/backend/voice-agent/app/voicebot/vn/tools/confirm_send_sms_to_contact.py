import logging

from livekit.agents import RunContext, function_tool

from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_NO_PENDING_CONTACT_SMS, ERR_SMS_SEND_FAILED
from app.services import backend_api

logger = logging.getLogger("voice-agent.vn.tools.confirm_send_sms_to_contact")


@function_tool(raw_schema=raw_schema["confirm_send_sms_to_contact"])
async def confirm_send_sms_to_contact(raw_arguments: dict, context: RunContext) -> str:
    pending = context.userdata.get("pending_contact_sms")
    if not pending or not pending.get("phone_number"):
        return ERR_NO_PENDING_CONTACT_SMS

    message = (raw_arguments.get("message") or "").strip()
    if not message:
        return "Anh/chị muốn nhắn nội dung gì cho người này?"

    context.userdata["pending_contact_sms"] = None
    name = pending.get("name", "")

    try:
        await backend_api.send_sms(message, phone_number=pending["phone_number"])
    except Exception:
        logger.error("confirm_send_sms_to_contact API failed", exc_info=True)
        return ERR_SMS_SEND_FAILED

    return f"Đã gửi tin nhắn cho {name}."
