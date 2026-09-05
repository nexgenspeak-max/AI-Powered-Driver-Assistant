"""List completed or cancelled trips from prefetched driver context."""
from __future__ import annotations

from datetime import datetime, timezone

from livekit.agents import RunContext, function_tool

from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.processors import context_store
from app.voicebot.processors.trip_format import short_address
from app.voicebot.prompts.tool_response import ToolResponse


def _is_today(iso: str) -> bool:
    if not iso:
        return False
    try:
        ts = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return False
    now = datetime.now(timezone.utc)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    local_now = now.astimezone()
    local_ts = ts.astimezone()
    return local_ts.date() == local_now.date()


def _trip_day_key(trip: dict) -> str:
    return (trip.get("updated_at") or trip.get("created_at") or "").strip()


@function_tool(raw_schema=raw_schema["check_trip_history"])
async def check_trip_history(raw_arguments: dict, context: RunContext) -> str:
    scope = (raw_arguments.get("scope") or "completed_today").strip().lower()
    if scope not in ("completed_today", "cancelled_today"):
        scope = "completed_today"

    key = "completed_trips" if scope == "completed_today" else "cancelled_trips"
    trips = list(context_store.get(context.userdata, key, []) or [])
    today = [t for t in trips if _is_today(_trip_day_key(t))]

    if scope == "completed_today":
        if not today:
            spoken = "Hôm nay chưa có chuyến nào hoàn thành."
        elif len(today) == 1:
            name = today[0].get("customer_name") or "khách"
            spoken = f"Hôm nay bạn hoàn thành 1 chuyến với {name}."
        else:
            spoken = f"Hôm nay bạn hoàn thành {len(today)} chuyến."
    else:
        if not today:
            spoken = "Hôm nay không có chuyến nào bị hủy trong danh sách gần đây."
        elif len(today) == 1:
            name = today[0].get("customer_name") or "khách"
            spoken = f"Hôm nay có 1 chuyến bị hủy với {name}."
        else:
            spoken = f"Hôm nay có {len(today)} chuyến bị hủy."

    rows = []
    for i, t in enumerate(today[:5], 1):
        name = t.get("customer_name") or "khách"
        pickup = short_address(t.get("pickup_address", ""), 28)
        rows.append(f"{i}. {name} — {pickup} — {t.get('status', '')}")

    reply = ToolResponse(
        tool="check_trip_history",
        lang="vi",
        knowledge_data=[f"scope: {scope}", f"count: {len(today)}"] + rows,
        response_rules=["Chỉ nói số lượng; chi tiết từng chuyến khi tài xế hỏi tiếp"],
        response_knowledge=spoken,
        follow_up_knowledge=rows or ["(empty)"],
        action_knowledge=[],
    )
    return await context_store.speak_and_stop(context.session, reply)
