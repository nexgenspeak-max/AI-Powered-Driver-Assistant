"""Shared schedule tool replies — vn/en check_upcoming_trips use this."""
from __future__ import annotations

from app.voicebot.processors import context_store
from app.voicebot.processors.trip_days import in_day_window
from app.voicebot.processors.trip_response import (
    build_trip_count_response,
    build_trip_detail_response,
    build_trip_list_response,
)
from app.voicebot.prompts.tool_response import ToolResponse

IN_PROGRESS_STATUSES = ("confirmed", "arrived_pickup", "picked_up")
NOT_PICKED_UP_STATUSES = ("confirmed", "arrived_pickup")
PICKED_UP_STATUSES = ("picked_up",)
AWAITING_CONFIRMATION_STATUSES = ("notified", "calling")
NEW_STATUSES = ("pending",)

_SCOPE_LABELS_VI = {
    "in_progress": "đang chạy",
    "not_picked_up": "đang chạy nhưng chưa đón khách",
    "picked_up": "đã đón khách",
    "awaiting_confirmation": "đang chờ xác nhận",
    "new": "mới tạo",
}
_SCOPE_LABELS_EN = {
    "in_progress": "in progress",
    "not_picked_up": "in progress but not yet picked up",
    "picked_up": "picked up",
    "awaiting_confirmation": "awaiting confirmation",
    "new": "new",
}
_DAY_LABELS = {"vi": {"today": "hôm nay", "tomorrow": "ngày mai"}, "en": {"today": "today", "tomorrow": "tomorrow"}}


def _day_arg(raw_arguments: dict) -> str:
    day = (raw_arguments.get("day") or "all").strip().lower()
    return day if day in ("today", "tomorrow") else "all"


def _awaiting_note(all_trips: list[dict], scope: str, lang: str) -> str:
    if scope not in ("in_progress", "not_picked_up", "picked_up"):
        return ""
    awaiting_count = sum(
        1 for t in all_trips if t.get("status") in AWAITING_CONFIRMATION_STATUSES
    )
    if not awaiting_count:
        return ""
    if lang == "en":
        plural = "s" if awaiting_count != 1 else ""
        return (
            f" You also have {awaiting_count} trip{plural} awaiting confirmation"
            " — would you like to hear it?"
        )
    return (
        f" Ngoài ra bạn còn {awaiting_count} chuyến đang chờ xác nhận"
        ", bạn có muốn nghe không?"
    )


def _append_note(response: ToolResponse, note: str) -> ToolResponse:
    if not note:
        return response
    response.response_knowledge += note
    response.follow_up_knowledge.append(note.strip())
    return response


def format_schedule_reply(userdata: dict, raw_arguments: dict, *, lang: str) -> ToolResponse | str:
    err_no_upcoming = (
        "You don't have any upcoming trips."
        if lang == "en"
        else "Bạn không có chuyến sắp tới nào."
    )
    trips = context_store.get_schedule_trips(userdata)
    if not trips:
        return err_no_upcoming

    all_trips = trips
    scope = raw_arguments.get("scope") or "all"
    if scope == "in_progress":
        trips = [t for t in all_trips if t.get("status") in IN_PROGRESS_STATUSES]
    elif scope == "not_picked_up":
        trips = [t for t in all_trips if t.get("status") in NOT_PICKED_UP_STATUSES]
    elif scope == "picked_up":
        trips = [t for t in all_trips if t.get("status") in PICKED_UP_STATUSES]
    elif scope == "awaiting_confirmation":
        trips = [t for t in all_trips if t.get("status") in AWAITING_CONFIRMATION_STATUSES]
    elif scope == "new":
        trips = [t for t in all_trips if t.get("status") in NEW_STATUSES]
    # Day filter on the scheduled pickup time. Undated pickup_time (walk-ups,
    # "đi ngay" bookings) counts as today — see trip_days.in_day_window.
    day = _day_arg(raw_arguments)
    if day != "all":
        trips = [t for t in trips if in_day_window(t.get("pickup_time"), day)]
    day_label = _DAY_LABELS["en" if lang == "en" else "vi"].get(day)
    if not trips:
        labels = _SCOPE_LABELS_EN if lang == "en" else _SCOPE_LABELS_VI
        label = labels.get(scope)
        if day_label and not label:
            return (f"You don't have any trips {day_label}." if lang == "en"
                    else f"{day_label.capitalize()} bạn không có chuyến nào.")
        if label:
            if lang == "en":
                return f"You don't have any {label} trips" + (f" {day_label}." if day_label else ".")
            return f"Bạn không có chuyến nào {label}" + (f" {day_label}." if day_label else ".")
        return err_no_upcoming

    note = _awaiting_note(all_trips, scope, lang)
    # Models sometimes fill every property with a default (trip_index=0,
    # list_all=false); 0 is not a choice, so treat it as "not provided".
    trip_index = raw_arguments.get("trip_index") or None
    if trip_index is not None:
        idx = int(trip_index)
        if idx < 1 or idx > len(trips):
            if lang == "en":
                return f"You only have {len(trips)} trip(s). Please choose 1 to {len(trips)}."
            return f"Bạn chỉ có {len(trips)} chuyến. Vui lòng chọn từ 1 đến {len(trips)}."
        trip = trips[idx - 1]
        context_store.set_target_trip(userdata, trip)
        return _append_note(build_trip_detail_response(trip, idx, lang), note)

    if raw_arguments.get("list_all"):
        return _append_note(build_trip_list_response(trips, lang), note)

    labels = _SCOPE_LABELS_EN if lang == "en" else _SCOPE_LABELS_VI
    scope_label = labels.get(scope) if scope != "all" else None
    if day_label:
        scope_label = f"{scope_label} {day_label}" if scope_label else day_label
    if trips:
        context_store.set_target_trip(userdata, trips[0])
    return build_trip_count_response(trips, lang, scope_label=scope_label)
