import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.services import backend_api
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.vn.tools.book_trip")


@function_tool(raw_schema=raw_schema["book_trip"])
async def book_trip(raw_arguments: dict, context: RunContext) -> str:
    customer_name   = raw_arguments["customer_name"]
    pickup_address  = raw_arguments["pickup_address"]
    dropoff_address = raw_arguments["dropoff_address"]
    pickup_time     = raw_arguments.get("pickup_time", "") or ""
    contact_phone   = raw_arguments.get("contact_phone", "") or context.userdata.get("customer_phone", "")

    try:
        trip = await backend_api.create_trip(
            customer_name=customer_name,
            customer_phone=contact_phone,
            pickup_address=pickup_address,
            dropoff_address=dropoff_address,
            pickup_time=pickup_time,
        )
    except Exception:
        logger.error("book_trip failed", exc_info=True)
        return "Không thể đặt xe lúc này. Vui lòng thử lại sau."

    context_store.add_customer_trip(context.userdata, trip)

    if pickup_time:
        return (
            f"Đã đặt xe hẹn giờ từ {pickup_address} đến {dropoff_address}, "
            f"đón lúc {pickup_time}."
        )

    msg = f"Đã đặt xe thành công từ {pickup_address} đến {dropoff_address}."
    eta = trip.get("eta_minutes")
    if eta and int(eta) > 0:
        msg += f" Tài xế dự kiến đến trong khoảng {eta} phút."
    return msg
