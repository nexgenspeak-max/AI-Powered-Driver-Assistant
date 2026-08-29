import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_NO_PENDING_CUSTOM_CALL
from app.voicebot.processors import custom_call
from app.voicebot.processors.tool_reply import as_llm, call_follow_up_actions, contact_call_actions
from app.voicebot.processors.tool_response_builders import build_mutation_response

logger = logging.getLogger("voice-agent.vn.tools.confirm_call_custom_number")


def _wrap_call_result(userdata: dict, result, *, tool: str):
    if isinstance(result, str):
        return as_llm(
            userdata,
            build_mutation_response(
                result,
                tool=tool,
                lang="vi",
                action=call_follow_up_actions(lang="vi"),
            ),
        )
    return result


@function_tool(raw_schema=raw_schema["confirm_call_custom_number"])
async def confirm_call_custom_number(raw_arguments: dict, context: RunContext):
    pending = context.userdata.get("pending_custom_call")
    if not pending or not pending.get("phone_number"):
        return as_llm(
            context.userdata,
            build_mutation_response(
                ERR_NO_PENDING_CUSTOM_CALL,
                tool="confirm_call_custom_number",
                lang="vi",
                action=contact_call_actions(lang="vi"),
            ),
        )

    context.userdata["pending_custom_call"] = None
    context.userdata["custom_call_count"] = context.userdata.get("custom_call_count", 0) + 1

    result = await custom_call.start_bridge_call_to_number(
        context,
        pending["phone_number"],
        contact_name=pending.get("contact_name", ""),
        lang="vn",
    )
    return _wrap_call_result(context.userdata, result, tool="confirm_call_custom_number")
