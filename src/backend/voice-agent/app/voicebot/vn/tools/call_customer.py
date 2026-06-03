import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_CANNOT_CALL, ERR_NO_ACTIVE_DRIVER
from app.services import backend_api

logger = logging.getLogger("voice-agent.vn.tools.call_customer")


@function_tool(raw_schema=raw_schema["call_customer"])
async def call_customer(raw_arguments: dict, context: RunContext) -> str:
    mode         = raw_arguments.get("mode", "bridge")
    driver_phone = context.userdata["driver_phone"]
    try:
        current = await backend_api.get_current_trip(driver_phone)
    except Exception:
        logger.error("call_customer — get_current_trip failed", exc_info=True)
        return ERR_CANNOT_CALL
    if not current:
        return ERR_NO_ACTIVE_DRIVER

    name  = current.get("customer_name", "khách")
    phone = current.get("customer_phone", "")
    if not phone:
        return f"Không tìm thấy số điện thoại của {name}."

    try:
        result = await backend_api.start_call(
            driver_id=driver_phone,
            customer_id=phone,
            trip_id=current.get("trip_id", ""),
            phone_number=phone,
            mode=mode,
        )
    except Exception:
        logger.error("call_customer — start_call failed", exc_info=True)
        return (
            f"Không thể kết nối cuộc gọi đến {name} lúc này. "
            "Kiểm tra trip-service (:8002) và call-center (:8000) đang chạy."
        )

    dialed = result.get("dialed_number", phone)
    note   = result.get("override_note") or ""
    suffix = f" {note}" if note else ""

    if mode == "agent":
        return (
            f"Đang gọi {name} tại {dialed}.{suffix} "
            "AI đang nói chuyện với khách, vui lòng chờ. "
            "Sau khi gọi xong, tôi sẽ tóm tắt lại nội dung cho anh/chị."
        )
    return (
        f"Đã bắt đầu cuộc gọi đến {name} tại {dialed}.{suffix} "
        "Điện thoại khách sẽ đổ chuông — anh/chị chờ kết nối."
    )
