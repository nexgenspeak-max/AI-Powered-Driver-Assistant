"""
Customer tools — intents: CALL_CUSTOMER, GET_CUSTOMER_LOCATION,
CONFIRM_TRIP_WITH_CUSTOMER

Call flow for CALL_CUSTOMER:

  Before starting the call, the AI must ask the driver which mode they want:
    "agent"  — AI calls the customer, conducts the conversation itself, then
                summarizes what was said back to the driver.
    "bridge" — SIP bridge: driver is connected directly to the customer.

  After an "agent" call completes, the AI should use summarize_last_call
  to read the outcome back to the driver.
"""
import logging
from typing import Literal

from livekit.agents import RunContext
from livekit.agents.llm import function_tool
from app.services import backend_api

logger = logging.getLogger("voice-agent.tools.customer")

CallMode = Literal["agent", "bridge"]


class CustomerToolsMixin:

    @function_tool(
        name="call_customer",
        description=(
            "Gọi điện cho khách hàng của chuyến đang hoạt động. "
            "QUAN TRỌNG: Trước khi gọi, hỏi tài xế chọn chế độ:\n"
            "  • mode='agent'  — AI tự gọi và nói chuyện với khách, sau đó tóm tắt lại cho tài xế.\n"
            "  • mode='bridge' — Kết nối để tài xế trực tiếp nói chuyện với khách.\n"
            "Sau khi tài xế chọn xong, mới gọi tool này với đúng mode."
        ),
    )
    async def call_customer(self, context: RunContext, mode: CallMode = "bridge") -> str:
        try:
            current = await backend_api.get_current_trip(self._driver_phone)
        except Exception:
            logger.error("call_customer — get_current_trip failed", exc_info=True)
            return "Không thể tìm thấy thông tin khách hàng lúc này."

        if not current:
            return "Hiện tại anh/chị không có chuyến đang hoạt động để gọi cho khách."

        name  = current.get("customer_name", "khách")
        phone = current.get("customer_phone", "")

        if not phone:
            return f"Không tìm thấy số điện thoại của {name}."

        try:
            result = await backend_api.start_call(
                driver_id=self._driver_phone,
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
        note = result.get("override_note") or ""
        note_suffix = f" {note}" if note else ""

        if mode == "agent":
            return (
                f"Đang gọi {name} tại {dialed}.{note_suffix} "
                "AI đang nói chuyện với khách, vui lòng chờ. "
                "Sau khi gọi xong, tôi sẽ tóm tắt lại nội dung cho anh/chị."
            )
        return (
            f"Đã bắt đầu cuộc gọi đến {name} tại {dialed}.{note_suffix} "
            "Điện thoại khách sẽ đổ chuông — anh/chị chờ kết nối."
        )

    @function_tool(
        name="get_customer_location",
        description=(
            "Lấy địa điểm đón khách hàng hiện tại. "
            "Gọi khi tài xế hỏi 'khách đứng ở đâu', 'điểm đón ở đâu', 'địa chỉ đón'."
        ),
    )
    async def get_customer_location(self, context: RunContext) -> str:
        try:
            current = await backend_api.get_current_trip(self._driver_phone)
        except Exception:
            logger.error("get_customer_location failed", exc_info=True)
            return "Không thể lấy vị trí khách hàng lúc này."

        if not current:
            return "Hiện tại không có chuyến đang hoạt động."

        try:
            loc = await backend_api.get_trip_location(current["trip_id"])
            address = loc.get("pickupAddress", current.get("pickup_address", ""))
        except Exception:
            address = current.get("pickup_address", "")

        return f"Khách hàng ở điểm đón: {address}." if address else "Không tìm thấy vị trí khách."

    @function_tool(
        name="confirm_trip_with_customer",
        description=(
            "Gửi tin nhắn SMS xác nhận chuyến đi cho khách hàng. "
            "Gọi khi tài xế muốn thông báo cho khách biết mình đã nhận chuyến và đang trên đường."
        ),
    )
    async def confirm_trip_with_customer(self, context: RunContext) -> str:
        try:
            current = await backend_api.get_current_trip(self._driver_phone)
        except Exception:
            logger.error("confirm_trip_with_customer failed", exc_info=True)
            return "Không thể gửi xác nhận lúc này."

        if not current:
            return "Không có chuyến đang hoạt động để xác nhận."

        try:
            await backend_api.confirm_trip_with_customer(current["trip_id"])
        except Exception:
            logger.error("confirm_trip_with_customer API failed", exc_info=True)
            return "Không thể gửi xác nhận lúc này. Vui lòng thử lại."

        customer = current.get("customer_name", "khách hàng")
        return f"Đã gửi tin nhắn xác nhận chuyến đi cho {customer}."
