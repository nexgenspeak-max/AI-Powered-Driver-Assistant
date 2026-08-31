import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.locales.vn.constants import ERR_ETA_UNCONFIRMED
from app.voicebot.processors import context_store, driver_call
from app.voicebot.processors.tool_reply import as_llm, call_follow_up_actions, customer_trip_actions
from app.voicebot.processors.tool_response_builders import build_mutation_response

logger = logging.getLogger("voice-agent.vn.tools.call_driver")


def _wrap_call_result(userdata: dict, result, *, tool: str):
    if isinstance(result, str):
        return as_llm(
            userdata,
            build_mutation_response(
                result,
                tool=tool,
                lang="vi",
                action=call_follow_up_actions(lang="vi") + customer_trip_actions(lang="vi"),
            ),
        )
    return result


@function_tool(raw_schema=raw_schema["call_driver"])
async def call_driver(raw_arguments: dict, context: RunContext):
    trip = context_store.get_active_customer_trip(context.userdata)
    if not trip or trip.get("status") != "confirmed":
        return as_llm(
            context.userdata,
            build_mutation_response(
                ERR_ETA_UNCONFIRMED,
                tool="call_driver",
                lang="vi",
                action=customer_trip_actions(lang="vi"),
            ),
        )

    result = await driver_call.start_bridge_call_to_driver(context, trip, lang="vn")
    return _wrap_call_result(context.userdata, result, tool="call_driver")
