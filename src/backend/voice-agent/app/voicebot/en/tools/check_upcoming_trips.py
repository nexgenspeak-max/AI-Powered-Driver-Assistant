import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.en.constants import ERR_NO_UPCOMING
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.trip_format import format_trip_detail, format_trip_list

logger = logging.getLogger("voice-agent.en.tools.check_upcoming_trips")

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


@function_tool(raw_schema=raw_schema["check_upcoming_trips"])
async def check_upcoming_trips(raw_arguments: dict, context: RunContext) -> str:
    # See vn/tools/check_upcoming_trips.py's comment — same fix, same reason:
    # the prefetched cache is a one-time session-start snapshot, so a trip
    # booked mid-session never shows up without a live re-fetch here.
    driver_phone = context.userdata.get("driver_phone", "")
    if driver_phone:
        try:
            fresh = await backend_api.get_upcoming_trips(driver_phone)
            context_store.set_upcoming_trips(context.userdata, fresh)
        except Exception:
            logger.warning("check_upcoming_trips — live refresh failed, using cached data", exc_info=True)

    trips = context_store.get_schedule_trips(context.userdata)
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
