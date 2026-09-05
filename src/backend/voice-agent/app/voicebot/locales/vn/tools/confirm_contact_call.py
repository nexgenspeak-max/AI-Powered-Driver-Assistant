import logging

from livekit.agents import RunContext, function_tool
from app.voicebot.processors import context_store

from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.locales.vn.constants import ERR_NO_PENDING_CONTACT_CALL
from app.voicebot.processors import custom_call, contact_call
from app.voicebot.processors.tool_reply import call_follow_up_actions, contact_call_actions
from app.voicebot.processors.tool_response_builders import build_mutation_response

logger = logging.getLogger("voice-agent.vn.tools.confirm_contact_call")


async def _wrap_call_result(context, result, *, tool: str):
    if isinstance(result, str):
        return await context_store.speak_and_stop(
            context.session,
                build_mutation_response(
                result,
                tool=tool,
                lang="vi",
                action=call_follow_up_actions(lang="vi"),
            ),
        )
    return result


@function_tool(raw_schema=raw_schema["confirm_contact_call"])
async def confirm_contact_call(raw_arguments: dict, context: RunContext):
    pending = context.userdata.get("pending_contact_call")
    logger.info("DIAL-TRACE confirm_contact_call: entered | pending=%r raw_arguments=%r", pending, raw_arguments)
    if not pending or not pending.get("phone_number"):
        logger.warning("DIAL-TRACE confirm_contact_call: no pending_contact_call, bailing")
        return await context_store.speak_and_stop(
            context.session,
                build_mutation_response(
                ERR_NO_PENDING_CONTACT_CALL,
                tool="confirm_contact_call",
                lang="vi",
                action=contact_call_actions(lang="vi"),
            ),
        )

    context.userdata["pending_contact_call"] = None

    mode = raw_arguments.get("mode") or "bridge"
    name = pending.get("name", "")
    phone_number = pending["phone_number"]

    try:
        if mode == "background":
            result = await contact_call.start_background_call_to_contact(
                context, phone_number, contact_name=name, lang="vn",
            )
        elif mode == "agent":
            message = (raw_arguments.get("message") or "").strip()
            result = await contact_call.start_agent_call_to_contact(
                context, phone_number, contact_name=name, custom_message=message, lang="vn",
            )
        else:
            result = await custom_call.start_bridge_call_to_number(
                context, phone_number, contact_name=name, lang="vn",
            )
    except Exception:
        logger.exception("DIAL-TRACE confirm_contact_call: dispatch raised — mode=%s name=%r", mode, name)
        raise

    logger.info("DIAL-TRACE confirm_contact_call: dispatch returned type=%s", type(result).__name__)
    return await _wrap_call_result(context, result, tool="confirm_contact_call")
