"""
Reminder tools — intents: CREATE_REMINDER
"""
import logging
from livekit.agents import RunContext
from livekit.agents.llm import function_tool
from app.services import backend_api

logger = logging.getLogger("voice-agent.tools.reminder")


class ReminderToolsMixin:

    @function_tool(
        name="create_reminder",
        description=(
            "Đặt nhắc nhở tự động trước khi đến giờ đón khách. "
            "Gọi khi tài xế nói 'nhắc tôi', 'đặt nhắc nhở', 'báo tôi trước X phút'. "
            "minutes_before mặc định 10 nếu tài xế không chỉ định."
        ),
    )
    async def create_reminder(self, context: RunContext, minutes_before: int = 10) -> str:
        try:
            current = await backend_api.get_current_trip(self._driver_phone)
            if not current:
                trips = await backend_api.get_upcoming_trips(self._driver_phone)
                current = trips[0] if trips else None
        except Exception:
            logger.error("create_reminder — fetch trip failed", exc_info=True)
            return "Không thể đặt nhắc nhở lúc này."

        if not current:
            return "Không tìm thấy chuyến đi để đặt nhắc nhở."

        try:
            await backend_api.create_reminder(
                driver_id=self._driver_phone,
                trip_id=current["trip_id"],
                remind_before_minutes=minutes_before,
            )
        except Exception:
            logger.error("create_reminder API failed", exc_info=True)
            return "Không thể đặt nhắc nhở lúc này. Vui lòng thử lại."

        return f"Đã đặt nhắc nhở trước {minutes_before} phút khi đến giờ đón khách."
