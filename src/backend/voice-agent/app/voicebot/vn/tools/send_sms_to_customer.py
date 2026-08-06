import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_SMS_SEND_FAILED
from app.services import backend_api
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.vn.tools.send_sms_to_customer")


@function_tool(raw_schema=raw_schema["send_sms_to_customer"])
async def send_sms_to_customer(raw_arguments: dict, context: RunContext) -> str:
    message = (raw_arguments.get("message") or "").strip()
    if not message:
        return "Anh/chị muốn nhắn nội dung gì cho khách?"

    current = context_store.get_current_trip(context.userdata)
    if not current:
        return "Không có chuyến đang hoạt động để nhắn tin cho khách."

    trip_id = current["trip_id"]
    customer = current.get("customer_name", "khách hàng")

    # Awaited (not schedule_sync's fire-and-forget) — unlike
    # confirm_trip_with_customer's canned message, a real SMS-send failure
    # here (e.g. Twilio geo-permission rejection) must reach the driver
    # instead of being silently logged while the AI claims success.
    try:
        await backend_api.send_sms(message, trip_id=trip_id)
    except Exception:
        logger.error("send_sms_to_customer API failed", exc_info=True)
        return ERR_SMS_SEND_FAILED

    return f"Đã gửi tin nhắn cho {customer}."
