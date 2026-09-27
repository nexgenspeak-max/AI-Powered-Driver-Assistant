import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.locales.vn.constants import ERR_NO_ACTIVE_CANCEL
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_reply import trip_actions
from app.voicebot.processors.tool_response_builders import build_mutation_response

logger = logging.getLogger("llm-orchestrator.vn.tools.request_cancel_trip")


# Mirrors the backend's CANCEL_RULES.cancelled_by_driver window (trip-
# service/src/routes/trips.ts) — a driver can only back out of a trip they've
# actually confirmed. `get_current_trip` alone isn't enough: its underlying
# ACTIVE set also matches notified/calling (a request the driver hasn't
# accepted yet), which the backend now rejects with a 409 for this status —
# that's `reject`, not a cancel.
DRIVER_CANCELLABLE_STATUSES = ("confirmed", "arrived_pickup", "picked_up")


@function_tool(raw_schema=raw_schema["request_cancel_trip"])
async def request_cancel_trip(raw_arguments: dict, context: RunContext) -> str:
    trip = context_store.resolve_customer_trip(context.userdata, raw_arguments)
    actions = trip_actions(lang="vi") + ["confirm_cancel_trip()"]
    if not trip or trip.get("status") not in DRIVER_CANCELLABLE_STATUSES:
        return await context_store.speak_and_stop(
            context.session,
                build_mutation_response(
                ERR_NO_ACTIVE_CANCEL,
                tool="request_cancel_trip",
                lang="vi",
                action=actions,
            ),
        )
    context.userdata["pending_cancel_trip_id"] = trip["trip_id"]
    context_store.set_pending_driver_action(
        context.userdata,
        "cancel",
        {"trip_id": trip["trip_id"]},
        source="request_cancel_trip",
    )
    customer = trip.get("customer_name", "khách hàng")
    pickup_time = trip.get("pickup_time", "")
    spoken = (
        f"Bạn có chắc muốn hủy chuyến với {customer}"
        + (f" lúc {pickup_time}" if pickup_time else "")
        + " không? Nói 'có' để xác nhận hủy."
    )
    return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
            spoken,
            tool="request_cancel_trip",
            lang="vi",
            knowledge=[f"trip_id: {trip['trip_id']}", f"customer: {customer}"],
            action=["confirm_cancel_trip()"],
        ),
    )
