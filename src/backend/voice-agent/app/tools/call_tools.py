"""
Call tools — intents: SUMMARIZE_CALL
"""
import logging
from livekit.agents import RunContext
from livekit.agents.llm import function_tool
from app.services import backend_api

logger = logging.getLogger("voice-agent.tools.call")


class CallToolsMixin:

    @function_tool(
        name="summarize_last_call",
        description=(
            "Lấy và đọc tóm tắt cuộc gọi vừa rồi giữa tài xế và khách hàng. "
            "Gọi khi tài xế hỏi 'cuộc gọi vừa rồi nói gì', 'tóm tắt cuộc gọi', 'khách vừa nói gì'."
        ),
    )
    async def summarize_last_call(self, context: RunContext) -> str:
        try:
            summary = await backend_api.get_latest_call_summary(self._driver_phone)
        except Exception:
            logger.error("summarize_last_call failed", exc_info=True)
            return "Không thể lấy tóm tắt cuộc gọi lúc này."

        if not summary:
            return "Không tìm thấy cuộc gọi nào gần đây."

        return f"Cuộc gọi vừa rồi: {summary}"
