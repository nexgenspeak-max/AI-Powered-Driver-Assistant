"""
CustomerSupportToolsMixin — tools for the CUSTOMER-facing voice agent.

Customers call in via the customer app to:
  - Check their trip status / ETA
  - Cancel a booked trip
  - Ask general questions about their ride
"""
import logging
from livekit.agents import RunContext
from livekit.agents.llm import function_tool
from app.services import backend_api

logger = logging.getLogger("voice-agent.tools.customer_support")


class CustomerSupportToolsMixin:

    @function_tool(
        name="get_my_trip",
        description=(
            "Lấy thông tin chuyến đi hiện tại của khách hàng: trạng thái, tài xế, ETA, địa chỉ. "
            "Gọi khi khách hỏi 'xe đến chưa', 'chuyến tôi thế nào', 'tài xế ở đâu', 'còn bao lâu'."
        ),
    )
    async def get_my_trip(self, context: RunContext) -> str:
        try:
            trips = await backend_api.get_customer_trips(self._customer_phone)
        except Exception:
            logger.error("get_my_trip failed", exc_info=True)
            return "Hiện không thể lấy thông tin chuyến đi. Vui lòng thử lại."

        active = [
            t for t in trips
            if t.get("status") not in ("completed", "rejected", "no_answer")
        ]
        if not active:
            return "Bạn hiện không có chuyến đi nào đang hoạt động."

        t   = active[0]
        eta = t.get("eta_minutes")
        status_map = {
            "pending":   "đang tìm tài xế",
            "notified":  "đã thông báo tài xế",
            "calling":   "đang gọi tài xế",
            "confirmed": "tài xế đã nhận chuyến",
        }
        status_text = status_map.get(t.get("status", ""), t.get("status", ""))
        msg = (
            f"Chuyến của bạn: {status_text}. "
            f"Đón tại {t.get('pickup_address', '')}, đến {t.get('dropoff_address', '')}."
        )
        if eta and int(eta) > 0:
            msg += f" Tài xế sẽ đến trong khoảng {eta} phút."
        if t.get("driver_phone"):
            msg += f" Tài xế: {t.get('driver_phone')}."
        return msg

    @function_tool(
        name="cancel_my_trip",
        description=(
            "Hủy chuyến đi của khách hàng. "
            "Gọi sau khi khách xác nhận muốn hủy. "
            "Luôn hỏi xác nhận trước: 'Bạn có chắc muốn hủy chuyến không?'"
        ),
    )
    async def cancel_my_trip(self, context: RunContext) -> str:
        try:
            trips = await backend_api.get_customer_trips(self._customer_phone)
        except Exception:
            logger.error("cancel_my_trip — fetch failed", exc_info=True)
            return "Không thể tìm thấy chuyến đi lúc này."

        active = [
            t for t in trips
            if t.get("status") in ("pending", "notified", "calling")
        ]
        if not active:
            return "Không có chuyến đi nào có thể hủy lúc này."

        trip = active[0]
        try:
            await backend_api.update_trip_status(trip["trip_id"], "rejected")
        except Exception:
            logger.error("cancel_my_trip — update failed", exc_info=True)
            return "Không thể hủy chuyến lúc này. Vui lòng thử lại."

        return f"Đã hủy chuyến đi của bạn. Cảm ơn bạn đã sử dụng dịch vụ."

    @function_tool(
        name="get_driver_eta",
        description=(
            "Lấy thông tin ETA (thời gian dự kiến tài xế đến) và vị trí tài xế. "
            "Gọi khi khách hỏi 'còn bao lâu', 'xe đến chưa', 'tài xế gần chưa'."
        ),
    )
    async def get_driver_eta(self, context: RunContext) -> str:
        try:
            trips = await backend_api.get_customer_trips(self._customer_phone)
        except Exception:
            logger.error("get_driver_eta failed", exc_info=True)
            return "Không thể lấy thông tin lúc này."

        active = [
            t for t in trips
            if t.get("status") == "confirmed"
        ]
        if not active:
            return "Tài xế chưa xác nhận chuyến. Vui lòng chờ thêm."

        t   = active[0]
        eta = t.get("eta_minutes")
        if not eta or int(eta) <= 0:
            return "Tài xế đã xác nhận nhận chuyến và đang trên đường đến."

        return f"Tài xế dự kiến đến trong khoảng {eta} phút nữa."
