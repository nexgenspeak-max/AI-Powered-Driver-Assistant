import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_CONFIRM_FAIL
from app.services import backend_api
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.vn.tools.confirm_trip_with_customer")


@function_tool(raw_schema=raw_schema["confirm_trip_with_customer"])
async def confirm_trip_with_customer(raw_arguments: dict, context: RunContext) -> str:
    current = context_store.get_current_trip(context.userdata)
    if not current:
        return "Không có chuyến đang hoạt động để xác nhận."

    trip_id = current["trip_id"]
    customer = current.get("customer_name", "khách hàng")

    async def _sync() -> None:
        try:
            await backend_api.confirm_trip_with_customer(trip_id)
        except Exception:
            logger.error("confirm_trip_with_customer API failed", exc_info=True)

    context_store.schedule_sync(_sync())
    return f"Đã gửi tin nhắn xác nhận chuyến đi cho {customer}."
