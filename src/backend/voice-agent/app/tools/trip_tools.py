"""
Trip tools — intents: CHECK_UPCOMING_TRIPS, UPDATE_TRIP_STATUS,
CONFIRM_TRIP, REJECT_TRIP, CANCEL_TRIP
"""
import logging
from typing import Literal

from livekit.agents import RunContext
from livekit.agents.llm import function_tool
from app.services import backend_api

logger = logging.getLogger("voice-agent.tools.trip")

TripStatusUpdate = Literal["ARRIVED_PICKUP", "PICKED_UP", "COMPLETED"]


class TripToolsMixin:

    # ── Inbound ───────────────────────────────────────────────────────────────

    @function_tool(
        name="check_upcoming_trips",
        description=(
            "Kiểm tra danh sách chuyến đi sắp tới của tài xế. "
            "Gọi khi tài xế hỏi về lịch chuyến, chuyến tiếp theo, hoặc muốn xem danh sách chuyến."
        ),
    )
    async def check_upcoming_trips(self, context: RunContext) -> str:
        try:
            trips = await backend_api.get_upcoming_trips(self._driver_phone)
        except Exception:
            logger.error("check_upcoming_trips failed", exc_info=True)
            return "Hiện không thể lấy thông tin chuyến đi. Vui lòng thử lại sau."

        if not trips:
            return "Hiện tại anh/chị không có chuyến đi nào sắp tới."

        t = trips[0]
        return (
            f"Anh/chị có {len(trips)} chuyến. "
            f"Chuyến gần nhất lúc {t.get('pickup_time', '')}: "
            f"đón {t.get('customer_name', 'khách')} tại {t.get('pickup_address', '')}, "
            f"đến {t.get('dropoff_address', '')}."
        )

    @function_tool(
        name="update_trip_status",
        description=(
            "Cập nhật trạng thái chuyến đi hiện tại của tài xế. "
            "Gọi khi tài xế nói đã đến điểm đón, đã đón được khách, hoặc đã hoàn thành chuyến."
        ),
    )
    async def update_trip_status(
        self,
        context: RunContext,
        status: TripStatusUpdate,
    ) -> str:
        labels = {
            "ARRIVED_PICKUP": "đã đến điểm đón",
            "PICKED_UP":      "đã đón khách",
            "COMPLETED":      "đã hoàn thành chuyến",
        }
        label = labels.get(status.upper(), status)

        try:
            current = await backend_api.get_current_trip(self._driver_phone)
        except Exception:
            logger.error("update_trip_status — get_current_trip failed", exc_info=True)
            return "Không thể cập nhật trạng thái lúc này."

        if not current:
            return "Không có chuyến đang hoạt động để cập nhật."

        try:
            await backend_api.update_trip_status(current["trip_id"], status.upper())
        except Exception:
            logger.error("update_trip_status API failed", exc_info=True)
            return "Không thể cập nhật trạng thái lúc này. Vui lòng thử lại."

        return f"Đã cập nhật trạng thái: {label}."

    # ── Outbound ──────────────────────────────────────────────────────────────

    @function_tool(
        name="confirm_trip",
        description=(
            "Xác nhận nhận chuyến đi mới. "
            "Gọi khi tài xế đồng ý, nói 'có', 'nhận', hoặc 'đồng ý' trong cuộc gọi thông báo chuyến mới."
        ),
    )
    async def confirm_trip(self, context: RunContext) -> str:
        if not self._trip:
            return "Không có chuyến nào đang chờ xác nhận."
        try:
            await backend_api.update_trip_status(self._trip["trip_id"], "confirmed")
        except Exception:
            logger.error("confirm_trip failed", exc_info=True)
        await context.session.say(
            "Đã xác nhận chuyến đi. Chúc anh/chị lái xe an toàn!",
            allow_interruptions=False,
        )
        return "confirmed"

    @function_tool(
        name="reject_trip",
        description=(
            "Từ chối chuyến đi mới. "
            "Gọi khi tài xế không muốn nhận, nói 'không', 'từ chối', hoặc 'bận' trong cuộc gọi thông báo."
        ),
    )
    async def reject_trip(self, context: RunContext) -> str:
        if not self._trip:
            return "Không có chuyến nào đang chờ xác nhận."
        try:
            await backend_api.update_trip_status(self._trip["trip_id"], "rejected")
        except Exception:
            logger.error("reject_trip failed", exc_info=True)
        await context.session.say("Đã ghi nhận. Cảm ơn anh/chị!", allow_interruptions=False)
        return "rejected"

    @function_tool(
        name="request_cancel_trip",
        description=(
            "Bước 1: Hỏi xác nhận trước khi hủy chuyến đang hoạt động. "
            "Gọi khi tài xế muốn hủy chuyến. KHÔNG hủy ngay — phải hỏi xác nhận trước."
        ),
    )
    async def request_cancel_trip(self, context: RunContext) -> str:
        try:
            current = await backend_api.get_current_trip(self._driver_phone)
        except Exception:
            return "Không thể tìm thấy chuyến đi lúc này."

        if not current:
            return "Không có chuyến đang hoạt động để hủy."

        self._pending_cancel_trip_id = current["trip_id"]
        customer    = current.get("customer_name", "khách hàng")
        pickup_time = current.get("pickup_time", "")
        return (
            f"Anh/chị có chắc muốn hủy chuyến với {customer}"
            + (f" lúc {pickup_time}" if pickup_time else "")
            + " không? Nói 'có' để xác nhận hủy."
        )

    @function_tool(
        name="confirm_cancel_trip",
        description=(
            "Bước 2: Thực hiện hủy chuyến sau khi tài xế đã xác nhận. "
            "Chỉ gọi sau khi đã hỏi qua request_cancel_trip và tài xế đã nói 'có'."
        ),
    )
    async def confirm_cancel_trip(self, context: RunContext) -> str:
        trip_id = getattr(self, "_pending_cancel_trip_id", None)
        if not trip_id:
            return "Không có yêu cầu hủy chuyến đang chờ xác nhận."
        try:
            await backend_api.update_trip_status(trip_id, "CANCELLED_BY_DRIVER")
            self._pending_cancel_trip_id = None
        except Exception:
            logger.error("confirm_cancel_trip failed", exc_info=True)
            return "Không thể hủy chuyến lúc này. Vui lòng thử lại."
        return "Đã hủy chuyến đi."
