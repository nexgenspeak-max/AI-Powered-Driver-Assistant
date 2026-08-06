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
UPCOMING_STATUSES = ("pending", "notified", "calling")

_SCOPE_LABELS_EN = {
    "in_progress": "in progress",
    "upcoming": "upcoming",
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

    scope = raw_arguments.get("scope") or "all"
    if scope == "in_progress":
        trips = [t for t in trips if t.get("status") in IN_PROGRESS_STATUSES]
    elif scope == "upcoming":
        trips = [t for t in trips if t.get("status") in UPCOMING_STATUSES]
    if not trips:
        label = _SCOPE_LABELS_EN.get(scope)
        return f"You don't have any {label} trips." if label else ERR_NO_UPCOMING

    trip_index = raw_arguments.get("trip_index")
    if trip_index is not None:
        idx = int(trip_index)
        if idx < 1 or idx > len(trips):
            return f"You only have {len(trips)} trip(s). Please choose 1 to {len(trips)}."
        return format_trip_detail(trips[idx - 1], idx, lang="en")

    return format_trip_list(trips, lang="en")
