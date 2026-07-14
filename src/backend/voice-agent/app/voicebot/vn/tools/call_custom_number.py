import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_INVALID_CUSTOM_PHONE, ERR_CUSTOM_CALL_LIMIT
from app.voicebot.processors import custom_call

logger = logging.getLogger("voice-agent.vn.tools.call_custom_number")


@function_tool(raw_schema=raw_schema["call_custom_number"])
async def call_custom_number(raw_arguments: dict, context: RunContext) -> str:
    phone_number = (raw_arguments.get("phone_number") or "").strip()
    contact_name = (raw_arguments.get("contact_name") or "").strip()

    if not custom_call.is_valid_vn_phone(phone_number):
        return ERR_INVALID_CUSTOM_PHONE

    call_count = context.userdata.get("custom_call_count", 0)
    if call_count >= custom_call.MAX_CUSTOM_CALLS_PER_SESSION:
        return ERR_CUSTOM_CALL_LIMIT

    normalized = custom_call.normalize_vn_phone(phone_number)
    context.userdata["pending_custom_call"] = {
        "phone_number": normalized,
        "contact_name": contact_name,
    }

    spoken = custom_call.format_for_speech(normalized)
    who = f" cho {contact_name}" if contact_name else ""
    return (
        f"Anh/chị muốn tôi gọi{who} tới số {spoken}, đúng không? "
        "Nói 'đúng' hoặc 'gọi đi' để tôi gọi, hoặc đọc lại số nếu tôi nghe nhầm."
    )
