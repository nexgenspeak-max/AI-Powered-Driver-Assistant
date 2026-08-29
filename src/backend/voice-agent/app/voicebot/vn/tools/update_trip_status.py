import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import STATUS_LABELS, ERR_CANNOT_UPDATE, ERR_NO_CURRENT_TRIP
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_reply import as_llm, trip_actions
from app.voicebot.processors.tool_response_builders import build_mutation_response

logger = logging.getLogger("voice-agent.vn.tools.update_trip_status")


@function_tool(raw_schema=raw_schema["update_trip_status"])
async def update_trip_status(raw_arguments: dict, context: RunContext) -> str:
    status = raw_arguments.get("status", "").upper()
    label = STATUS_LABELS.get(status, status)
    actions = trip_actions(lang="vi")
    trip = context_store.resolve_customer_trip(context.userdata, raw_arguments)
    if not trip:
        return as_llm(
            context.userdata,
            build_mutation_response(
                ERR_NO_CURRENT_TRIP,
                tool="update_trip_status",
                lang="vi",
                action=actions,
            ),
        )

    trip_id = trip["trip_id"]

    try:
        updated = await backend_api.update_trip_status(trip_id, status)
    except Exception:
        logger.error("update_trip_status API failed", exc_info=True)
        return as_llm(
            context.userdata,
            build_mutation_response(
                ERR_CANNOT_UPDATE,
                tool="update_trip_status",
                lang="vi",
                action=actions,
            ),
        )

    context_store.patch_current_trip(context.userdata, **updated)
    return as_llm(
        context.userdata,
        build_mutation_response(
            f"Đã cập nhật trạng thái: {label}.",
            tool="update_trip_status",
            lang="vi",
            knowledge=[f"trip_id: {trip_id}", f"status: {status}"],
            action=actions,
        ),
    )
