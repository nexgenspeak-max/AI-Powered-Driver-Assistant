"""Period earnings (week/month/yesterday/last_week) — uses trip-service summary API."""
from __future__ import annotations

import logging

from livekit.agents import RunContext, function_tool

from app.services import backend_api
from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.processors import context_store
from app.voicebot.processors.trip_format import fmt_money
from app.voicebot.prompts.tool_response import ToolResponse

logger = logging.getLogger("llm-orchestrator.en.tools.get_earnings_summary")

_PERIOD_LABEL = {
    "week": "Last 7 days",
    "month": "Last 30 days",
    "yesterday": "Yesterday",
    "last_week": "Last week",
}


@function_tool(raw_schema=raw_schema["get_earnings_summary"])
async def get_earnings_summary(raw_arguments: dict, context: RunContext) -> str:
    period = (raw_arguments.get("period") or "week").strip().lower()
    if period not in _PERIOD_LABEL:
        return await context_store.speak_and_stop(
            context.session,
                "I can only show today's, yesterday's, this week's, last week's, or this month's earnings. Ask again with one of those ranges.",
        )

    driver_phone = context.userdata.get("driver_phone") or ""
    if not driver_phone:
        return await context_store.speak_and_stop(
            context.session,
                "I don't have a driver account to load earnings for.",
        )

    try:
        data = await backend_api.get_earnings_summary(driver_phone, period=period)
    except Exception:
        logger.error("get_earnings_summary failed | period=%s", period, exc_info=True)
        return await context_store.speak_and_stop(
            context.session,
                "I couldn't load earnings right now. Please try again shortly.",
        )

    trips = int(data.get("trip_count") or 0)
    total = int(data.get("total_earnings") or 0)
    label = _PERIOD_LABEL[period]
    spoken = f"{label}: {trips} trip(s), earnings {fmt_money(total, 'en')}."
    reply = ToolResponse(
        tool="get_earnings_summary",
        lang="en",
        knowledge_data=[
            f"period: {period}",
            f"trip_count: {trips}",
            f"total_earnings: {fmt_money(total, 'en')}",
        ],
        response_rules=["Lead with trip count and total for the asked period only"],
        response_knowledge=spoken,
        follow_up_knowledge=[
            "Today: get_today_earnings",
            "Other range: get_earnings_summary(period=week|month|yesterday|last_week)",
        ],
        action_knowledge=[],
    )
    return await context_store.speak_and_stop(context.session, reply)
