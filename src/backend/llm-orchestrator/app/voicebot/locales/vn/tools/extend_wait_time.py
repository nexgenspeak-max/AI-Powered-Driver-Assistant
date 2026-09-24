import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.locales.vn.constants import ERR_EXTEND_WAIT_FAIL
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_reply import trip_actions
from app.voicebot.processors.tool_response_builders import build_mutation_response

logger = logging.getLogger("llm-orchestrator.vn.tools.extend_wait_time")


@function_tool(raw_schema=raw_schema["extend_wait_time"])
async def extend_wait_time(raw_arguments: dict, context: RunContext) -> str:
    minutes = int(raw_arguments.get("minutes") or 3)
    minutes = max(1, min(minutes, 10))
    driver_phone = context.userdata["driver_phone"]
    actions = trip_actions(lang="vi")

    trip = context_store.resolve_customer_trip(context.userdata, raw_arguments)
    if not trip:
        return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
                "Không có chuyến đang hoạt động.",
                tool="extend_wait_time",
                lang="vi",
                action=actions,
            ),
        )

    trip_id = trip["trip_id"]
    prev_wait = int(trip.get("wait_extra_minutes") or 0)
    optimistic_total = prev_wait + minutes

    try:
        result = await backend_api.extend_wait_time(
            trip_id=trip_id,
            driver_phone=driver_phone,
            extra_minutes=minutes,
        )
    except Exception:
        logger.error("extend_wait_time failed", exc_info=True)
        return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
                ERR_EXTEND_WAIT_FAIL,
                tool="extend_wait_time",
                lang="vi",
                action=actions,
            ),
        )

    total_wait = int(result.get("total_wait_minutes") or optimistic_total)
    context_store.patch_current_trip(context.userdata, wait_extra_minutes=total_wait)
    customer = trip.get("customer_name", "khách hàng")
    spoken = (
        f"Đã gia hạn thêm {minutes} phút. "
        f"Tổng thời gian chờ {customer}: {total_wait} phút."
    )
    return await context_store.speak_and_stop(
        context.session,
        build_mutation_response(
            spoken,
            tool="extend_wait_time",
            lang="vi",
            knowledge=[f"trip_id: {trip_id}", f"total_wait_minutes: {total_wait}"],
            action=actions,
        ),
    )
