"""Shared check_trip_history reply — vn/en tools call build_history_reply.

Counts completed or cancelled trips from the prefetched context for a day
window (today / yesterday / last 7 days). The context only carries the
driver's ~50 most recent trips, so a 7-day count may be a floor; the reply
says "trong danh sách gần đây" when the list is at that cap.
"""
from __future__ import annotations

from app.voicebot.processors import context_store
from app.voicebot.processors.trip_days import in_day_window
from app.voicebot.processors.trip_format import short_address
from app.voicebot.prompts.tool_response import ToolResponse

CONTEXT_TRIP_CAP = 50

_LEGACY_SCOPES = {"completed_today": ("completed", "today"), "cancelled_today": ("cancelled", "today")}
_DAYS = ("today", "yesterday", "last_7_days")

_DAY_LABEL = {
    "vi": {"today": "Hôm nay", "yesterday": "Hôm qua", "last_7_days": "Bảy ngày qua"},
    "en": {"today": "Today", "yesterday": "Yesterday", "last_7_days": "In the last 7 days"},
}


def _trip_day_key(trip: dict) -> str:
    return (trip.get("updated_at") or trip.get("created_at") or "").strip()


def resolve_args(raw_arguments: dict) -> tuple[str, str]:
    scope = (raw_arguments.get("scope") or "completed").strip().lower()
    day = (raw_arguments.get("day") or "today").strip().lower()
    if scope in _LEGACY_SCOPES:
        scope, day = _LEGACY_SCOPES[scope]
    if scope not in ("completed", "cancelled"):
        scope = "completed"
    if day not in _DAYS:
        day = "today"
    return scope, day


def build_history_reply(userdata: dict, raw_arguments: dict, *, lang: str) -> ToolResponse:
    lc = "en" if lang == "en" else "vi"
    scope, day = resolve_args(raw_arguments)
    key = "completed_trips" if scope == "completed" else "cancelled_trips"
    all_rows = list(context_store.get(userdata, key, []) or [])
    rows = [t for t in all_rows if in_day_window(_trip_day_key(t), day)]
    n = len(rows)
    label = _DAY_LABEL[lc][day]
    capped = day == "last_7_days" and len(all_rows) >= CONTEXT_TRIP_CAP
    name = (rows[0].get("customer_name") if rows else None) or ("the customer" if lc == "en" else "khách")

    if lc == "en":
        if scope == "completed":
            spoken = (f"{label}: no completed trips yet." if n == 0
                      else f"{label} you completed 1 trip, with {name}." if n == 1
                      else f"{label} you completed {n} trips.")
        else:
            spoken = (f"{label}: no cancelled trips in the recent list." if n == 0
                      else f"{label} there was 1 cancelled trip, with {name}." if n == 1
                      else f"{label} there were {n} cancelled trips.")
        if capped:
            spoken += " That counts the most recent trips only."
        rule = "Lead with the count; details only on follow-up"
    else:
        if scope == "completed":
            spoken = (f"{label} chưa có chuyến nào hoàn thành." if n == 0
                      else f"{label} bạn hoàn thành 1 chuyến với {name}." if n == 1
                      else f"{label} bạn hoàn thành {n} chuyến.")
        else:
            spoken = (f"{label} không có chuyến nào bị hủy trong danh sách gần đây." if n == 0
                      else f"{label} có 1 chuyến bị hủy với {name}." if n == 1
                      else f"{label} có {n} chuyến bị hủy.")
        if capped:
            spoken += " Số này chỉ tính các chuyến gần đây nhất."
        rule = "Chỉ nói số lượng; chi tiết từng chuyến khi tài xế hỏi tiếp"

    detail = []
    for i, t in enumerate(rows[:5], 1):
        cname = t.get("customer_name") or ("customer" if lc == "en" else "khách")
        pickup = short_address(t.get("pickup_address", ""), 28)
        detail.append(f"{i}. {cname} — {pickup} — {t.get('status', '')}")

    return ToolResponse(
        tool="check_trip_history",
        lang=lc,
        knowledge_data=[f"scope: {scope}", f"day: {day}", f"count: {n}"]
        + (["note: context holds the 50 most recent trips; 7-day count may be a floor"] if capped else [])
        + detail,
        response_rules=[rule],
        response_knowledge=spoken,
        follow_up_knowledge=detail or ["(empty)"],
        action_knowledge=[],
    )
