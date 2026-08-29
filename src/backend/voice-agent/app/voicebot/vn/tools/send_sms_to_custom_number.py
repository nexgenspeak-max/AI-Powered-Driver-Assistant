import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_INVALID_CUSTOM_SMS_PHONE
from app.voicebot.processors import custom_call
from app.voicebot.processors.tool_reply import as_llm, contact_sms_actions
from app.voicebot.processors.tool_response_builders import build_mutation_response

logger = logging.getLogger("voice-agent.vn.tools.send_sms_to_custom_number")


@function_tool(raw_schema=raw_schema["send_sms_to_custom_number"])
async def send_sms_to_custom_number(raw_arguments: dict, context: RunContext) -> str:
    phone_number = (raw_arguments.get("phone_number") or "").strip()
    message = (raw_arguments.get("message") or "").strip()
    contact_name = (raw_arguments.get("contact_name") or "").strip()
    actions = contact_sms_actions(lang="vi")

    if not custom_call.is_valid_vn_phone(phone_number):
        return as_llm(
            context.userdata,
            build_mutation_response(
                ERR_INVALID_CUSTOM_SMS_PHONE,
                tool="send_sms_to_custom_number",
                lang="vi",
                action=actions,
            ),
        )
    if not message:
        return as_llm(
            context.userdata,
            build_mutation_response(
                "Bạn muốn nhắn nội dung gì tới số này?",
                tool="send_sms_to_custom_number",
                lang="vi",
                action=actions,
            ),
        )

    normalized = custom_call.normalize_vn_phone(phone_number)
    context.userdata["pending_custom_sms"] = {
        "phone_number": normalized,
        "message": message,
        "contact_name": contact_name,
    }

    spoken = custom_call.format_for_speech(normalized)
    who = f" cho {contact_name}" if contact_name else ""
    return as_llm(
        context.userdata,
        build_mutation_response(
            f"Bạn muốn tôi nhắn{who} tới số {spoken} với nội dung: \"{message}\", đúng không? "
            "Nói 'đúng' hoặc 'gửi đi' để tôi gửi, hoặc đọc lại số/nội dung nếu tôi nghe nhầm.",
            tool="send_sms_to_custom_number",
            lang="vi",
            knowledge=[f"phone: {spoken}", f"message: {message}"],
            action=["confirm_send_sms_to_custom_number(message=...)", *actions],
        ),
    )
