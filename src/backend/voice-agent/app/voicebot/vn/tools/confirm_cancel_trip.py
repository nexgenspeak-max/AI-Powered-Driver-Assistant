import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_NO_PENDING_CANCEL, ERR_CANNOT_CANCEL, TRIP_CANCELLED
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_reply import as_llm, trip_actions
from app.voicebot.processors.tool_response_builders import build_mutation_response

logger = logging.getLogger("voice-agent.vn.tools.confirm_cancel_trip")


@function_tool(raw_schema=raw_schema["confirm_cancel_trip"])
async def confirm_cancel_trip(raw_arguments: dict, context: RunContext) -> str:
    trip_id = context.userdata.get("pending_cancel_trip_id")
    actions = trip_actions(lang="vi")
    if not trip_id:
        return as_llm(
            context.userdata,
            build_mutation_response(
                ERR_NO_PENDING_CANCEL,
                tool="confirm_cancel_trip",
                lang="vi",
                action=actions,
            ),
        )

    try:
        await backend_api.update_trip_status(trip_id, "cancelled_by_driver")
    except Exception:
        logger.error("confirm_cancel_trip API failed", exc_info=True)
        return as_llm(
            context.userdata,
            build_mutation_response(
                ERR_CANNOT_CANCEL,
                tool="confirm_cancel_trip",
                lang="vi",
                action=actions,
            ),
        )

    context.userdata["pending_cancel_trip_id"] = None
    context_store.remove_trip_from_lists(context.userdata, trip_id)
    context_store.set_current_trip(context.userdata, None)
    return as_llm(
        context.userdata,
        build_mutation_response(
            TRIP_CANCELLED,
            tool="confirm_cancel_trip",
            lang="vi",
            knowledge=[f"trip_id: {trip_id}", "status: cancelled_by_driver"],
            action=actions,
        ),
    )
