import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.locales.vn.constants import ERR_NO_SHOW_FAIL
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_reply import trip_actions
from app.voicebot.processors.tool_response_builders import build_mutation_response

logger = logging.getLogger("llm-orchestrator.vn.tools.report_customer_no_show")


@function_tool(raw_schema=raw_schema["report_customer_no_show"])
async def report_customer_no_show(raw_arguments: dict, context: RunContext) -> str:
    driver_phone = context.userdata["driver_phone"]
    actions = trip_actions(lang="vi")
    trip = context_store.resolve_customer_trip(context.userdata, raw_arguments)
    if not trip:
        return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
                "Không có chuyến đang hoạt động.",
                tool="report_customer_no_show",
                lang="vi",
                action=actions,
            ),
        )

    trip_id = trip["trip_id"]
    customer = trip.get("customer_name", "khách hàng")

    # Await API before success speech — do not invent rating/cancel outcomes.
    try:
        await backend_api.report_no_show(trip_id, driver_phone)
    except Exception:
        logger.error("report_customer_no_show failed", exc_info=True)
        return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
                ERR_NO_SHOW_FAIL,
                tool="report_customer_no_show",
                lang="vi",
                action=actions,
            ),
        )

    context_store.patch_current_trip(context.userdata, status="no_show")
    context_store.set_current_trip(context.userdata, None)
    context_store.remove_trip_from_lists(context.userdata, trip_id)
    spoken = f"Đã báo cáo {customer} không xuất hiện."
    return await context_store.speak_and_stop(
        context.session,
        build_mutation_response(
            spoken,
            tool="report_customer_no_show",
            lang="vi",
            knowledge=[f"trip_id: {trip_id}", "status: no_show"],
            action=actions,
        ),
    )
