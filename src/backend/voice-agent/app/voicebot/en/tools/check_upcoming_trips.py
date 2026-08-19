from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.en.constants import ERR_NO_UPCOMING
from app.voicebot.processors import context_store
from app.voicebot.processors.trip_format import format_trip_detail, format_trip_list

# Mirrors vn/tools/check_upcoming_trips.py's split — status-based, same sets.
IN_PROGRESS_STATUSES = ("confirmed", "arrived_pickup", "picked_up")
NOT_PICKED_UP_STATUSES = ("confirmed", "arrived_pickup")
PICKED_UP_STATUSES = ("picked_up",)
AWAITING_CONFIRMATION_STATUSES = ("notified", "calling")
NEW_STATUSES = ("pending",)

_SCOPE_LABELS_EN = {
    "in_progress": "in progress",
    "not_picked_up": "in progress but not yet picked up",
    "picked_up": "picked up",
    "awaiting_confirmation": "awaiting confirmation",
    "new": "new",
}


def _format_trips_reply(userdata: dict, raw_arguments: dict) -> str:
    trips = context_store.get_schedule_trips(userdata)
    if not trips:
        return ERR_NO_UPCOMING

    all_trips = trips  # full schedule before scope filtering — used for the cross-notice below
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
    if not trips:
        label = _SCOPE_LABELS_EN.get(scope)
        return f"You don't have any {label} trips." if label else ERR_NO_UPCOMING

    # Driver only asked about in-progress trips (in any sub-form), but if there's a separate
    # trip awaiting confirmation, proactively mention it — don't make the driver ask again.
    awaiting_note = ""
    if scope in ("in_progress", "not_picked_up", "picked_up"):
        awaiting_count = sum(1 for t in all_trips if t.get("status") in AWAITING_CONFIRMATION_STATUSES)
        if awaiting_count:
            plural = "s" if awaiting_count != 1 else ""
            awaiting_note = (
                f" You also have {awaiting_count} trip{plural} awaiting confirmation"
                " — would you like to hear it?"
            )

    trip_index = raw_arguments.get("trip_index")
    if trip_index is not None:
        idx = int(trip_index)
        if idx < 1 or idx > len(trips):
            return f"You only have {len(trips)} trip(s). Please choose 1 to {len(trips)}."
        return format_trip_detail(trips[idx - 1], idx, lang="en") + awaiting_note

    return format_trip_list(trips, lang="en") + awaiting_note


@function_tool(raw_schema=raw_schema["check_upcoming_trips"])
async def check_upcoming_trips(raw_arguments: dict, context: RunContext) -> str:
    # Cache-first — see refresh_latest_data.py for the live re-fetch, only
    # triggered when the driver actually confirms they want it.
    reply = _format_trips_reply(context.userdata, raw_arguments)
    age_note = context_store.format_age_note(context.userdata, lang="en")
    context_store.set_pending_refresh(context.userdata, "upcoming_trips", dict(raw_arguments))
    return f"{reply} (as of {age_note}). Would you like me to get the latest data? It'll take a moment."
