"""Shared logic for checking background / recent customer call status."""
from __future__ import annotations

import logging

from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_response_builders import build_call_status_response
from app.voicebot.prompts.tool_response import ToolResponse

logger = logging.getLogger("voice-agent.processors.call_status")


async def check_call_status(userdata: dict, *, lang: str) -> ToolResponse:
    driver_phone = userdata.get("driver_phone", "")
    last_call = context_store.get(userdata, "last_call", {}) or {}

    try:
        record = await backend_api.get_latest_call_record(driver_phone)
    except Exception:
        logger.error("check_call_status failed", exc_info=True)
        error = (
            "Không lấy được trạng thái cuộc gọi lúc này."
            if lang == "vn"
            else "Unable to check call status right now."
        )
        return build_call_status_response(lang=lang, error=error)

    status = record.get("status", "")
    summary = record.get("summary", "") or last_call.get("summary", "")

    return build_call_status_response(lang=lang, status=status, summary=summary)
