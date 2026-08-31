import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.locales.en.constants import ERR_NO_PENDING_CUSTOM_SMS, ERR_SMS_SEND_FAILED
from app.services import backend_api
from app.voicebot.processors.tool_reply import as_llm, contact_sms_actions
from app.voicebot.processors.tool_response_builders import build_mutation_response

logger = logging.getLogger("voice-agent.en.tools.confirm_send_sms_to_custom_number")


@function_tool(raw_schema=raw_schema["confirm_send_sms_to_custom_number"])
async def confirm_send_sms_to_custom_number(raw_arguments: dict, context: RunContext) -> str:
    pending = context.userdata.get("pending_custom_sms")
    actions = contact_sms_actions(lang="en")
    if not pending or not pending.get("phone_number"):
        return as_llm(
            context.userdata,
            build_mutation_response(
                ERR_NO_PENDING_CUSTOM_SMS,
                tool="confirm_send_sms_to_custom_number",
                lang="en",
                action=actions,
            ),
        )

    context.userdata["pending_custom_sms"] = None

    try:
        await backend_api.send_sms(pending["message"], phone_number=pending["phone_number"])
    except Exception:
        logger.error("confirm_send_sms_to_custom_number API failed", exc_info=True)
        return as_llm(
            context.userdata,
            build_mutation_response(
                ERR_SMS_SEND_FAILED,
                tool="confirm_send_sms_to_custom_number",
                lang="en",
                action=actions,
            ),
        )

    who = pending.get("contact_name") or "that number"
    return as_llm(
        context.userdata,
        build_mutation_response(
            f"Text sent to {who}.",
            tool="confirm_send_sms_to_custom_number",
            lang="en",
            action=actions,
        ),
    )
