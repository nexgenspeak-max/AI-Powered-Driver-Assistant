import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.services import backend_api
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.vn.tools.extend_wait_time")


@function_tool(raw_schema=raw_schema["extend_wait_time"])
async def extend_wait_time(raw_arguments: dict, context: RunContext) -> str:
    minutes = int(raw_arguments.get("minutes") or 3)
    minutes = max(1, min(minutes, 10))
    driver_phone = context.userdata["driver_phone"]

    current = context_store.get_current_trip(context.userdata)
    if not current:
        return "Không có chuyến đang hoạt động."

    trip_id = current["trip_id"]
    prev_wait = int(current.get("wait_extra_minutes") or 0)
    total_wait = prev_wait + minutes
    context_store.patch_current_trip(context.userdata, wait_extra_minutes=total_wait)

    async def _sync() -> None:
        try:
            result = await backend_api.extend_wait_time(
                trip_id=trip_id,
                driver_phone=driver_phone,
                extra_minutes=minutes,
            )
            context_store.patch_current_trip(
                context.userdata,
                wait_extra_minutes=result.get("total_wait_minutes", total_wait),
            )
        except Exception:
            logger.error("extend_wait_time failed", exc_info=True)

    context_store.schedule_sync(_sync())
    customer = current.get("customer_name", "khách hàng")
    return (
        f"Đã gia hạn thêm {minutes} phút. "
        f"Tổng thời gian chờ {customer}: {total_wait} phút."
    )
