"""Shared logic for checking background / recent customer call status."""
from __future__ import annotations

import logging

from app.services import backend_api
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.processors.call_status")


async def check_call_status(userdata: dict, *, lang: str) -> str:
    driver_phone = userdata.get("driver_phone", "")
    last_call = context_store.get(userdata, "last_call", {}) or {}

    try:
        record = await backend_api.get_latest_call_record(driver_phone)
    except Exception:
        logger.error("check_call_status failed", exc_info=True)
        return (
            "Không lấy được trạng thái cuộc gọi lúc này."
            if lang == "vn"
            else "Unable to check call status right now."
        )

    status = record.get("status", "")
    summary = record.get("summary", "") or last_call.get("summary", "")
    mode = record.get("mode", "")

    if status == "in_progress":
        if lang == "en":
            return (
                "The AI is still on the call with the customer. "
                "You can keep asking other questions — say 'summarize the call' when you want the result."
            )
        return (
            "AI vẫn đang gọi khách. Anh/chị có thể hỏi việc khác — "
            "khi cần tóm tắt, nói 'tóm tắt cuộc gọi'."
        )

    if summary:
        if lang == "en":
            return f"The customer call is finished. Summary: {summary}"
        return f"Cuộc gọi khách đã xong. Tóm tắt: {summary}"

    if lang == "en":
        return "No recent customer call found."
    return "Không có cuộc gọi khách gần đây."
