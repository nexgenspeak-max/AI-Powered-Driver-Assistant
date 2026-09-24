"""Period earnings (week/month) — uses trip-service summary API."""
from __future__ import annotations

import logging

from livekit.agents import RunContext, function_tool

from app.services import backend_api
from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.processors import context_store
from app.voicebot.processors.trip_format import fmt_money
from app.voicebot.prompts.tool_response import ToolResponse

logger = logging.getLogger("llm-orchestrator.vn.tools.get_earnings_summary")

_PERIOD_LABEL = {"week": "7 ngày gần đây", "month": "30 ngày gần đây"}


@function_tool(raw_schema=raw_schema["get_earnings_summary"])
async def get_earnings_summary(raw_arguments: dict, context: RunContext) -> str:
    period = (raw_arguments.get("period") or "week").strip().lower()
    if period not in ("week", "month"):
        return await context_store.speak_and_stop(
            context.session,
                "Em chỉ xem được thu nhập hôm nay, tuần này hoặc tháng này. Bạn hỏi lại với một trong các khoảng đó nhé.",
        )

    driver_phone = context.userdata.get("driver_phone") or ""
    if not driver_phone:
        return await context_store.speak_and_stop(
            context.session,
                "Chưa xác định được tài khoản tài xế để xem thu nhập.",
        )

    try:
        data = await backend_api.get_earnings_summary(driver_phone, period=period)
    except Exception:
        logger.error("get_earnings_summary failed | period=%s", period, exc_info=True)
        return await context_store.speak_and_stop(
            context.session,
                "Không lấy được thu nhập lúc này. Bạn thử lại sau nhé.",
        )

    trips = int(data.get("trip_count") or 0)
    total = int(data.get("total_earnings") or 0)
    label = _PERIOD_LABEL[period]
    spoken = f"{label}: {trips} chuyến, thu nhập {fmt_money(total, 'vi')}."
    reply = ToolResponse(
        tool="get_earnings_summary",
        lang="vi",
        knowledge_data=[
            f"period: {period}",
            f"trip_count: {trips}",
            f"total_earnings: {fmt_money(total, 'vi')}",
        ],
        response_rules=["Chỉ nói số chuyến và tổng thu nhập của khoảng đã hỏi"],
        response_knowledge=spoken,
        follow_up_knowledge=[
            "Hôm nay: get_today_earnings",
            "Tuần/tháng khác: get_earnings_summary(period=week|month)",
        ],
        action_knowledge=[],
    )
    return await context_store.speak_and_stop(context.session, reply)
