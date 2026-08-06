import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_INVALID_CUSTOM_SMS_PHONE
from app.voicebot.processors import custom_call

logger = logging.getLogger("voice-agent.vn.tools.send_sms_to_custom_number")


@function_tool(raw_schema=raw_schema["send_sms_to_custom_number"])
async def send_sms_to_custom_number(raw_arguments: dict, context: RunContext) -> str:
    phone_number = (raw_arguments.get("phone_number") or "").strip()
    message = (raw_arguments.get("message") or "").strip()
    contact_name = (raw_arguments.get("contact_name") or "").strip()

    if not custom_call.is_valid_vn_phone(phone_number):
        return ERR_INVALID_CUSTOM_SMS_PHONE
    if not message:
        return "Anh/chị muốn nhắn nội dung gì tới số này?"

    normalized = custom_call.normalize_vn_phone(phone_number)
    context.userdata["pending_custom_sms"] = {
        "phone_number": normalized,
        "message": message,
        "contact_name": contact_name,
    }

    spoken = custom_call.format_for_speech(normalized)
    who = f" cho {contact_name}" if contact_name else ""
    return (
        f"Anh/chị muốn tôi nhắn{who} tới số {spoken} với nội dung: \"{message}\", đúng không? "
        "Nói 'đúng' hoặc 'gửi đi' để tôi gửi, hoặc đọc lại số/nội dung nếu tôi nghe nhầm."
    )
