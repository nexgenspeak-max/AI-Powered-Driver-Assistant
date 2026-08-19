import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.en.constants import TRIP_CONFIRMED, ERR_CANNOT_UPDATE
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.trip_format import short_address

logger = logging.getLogger("voice-agent.en.tools.confirm_trip")

# Mirrors check_upcoming_trips.py's own tuple — kept as a separate copy
# rather than importing it, same convention as elsewhere in this codebase.
AWAITING_CONFIRMATION_STATUSES = ("notified", "calling")


def _pending_trips(userdata: dict) -> list[dict]:
    return [
        t for t in context_store.get_schedule_trips(userdata)
        if t.get("status") in AWAITING_CONFIRMATION_STATUSES
    ]


@function_tool(raw_schema=raw_schema["confirm_trip"])
async def confirm_trip(raw_arguments: dict, context: RunContext) -> str:
    # Outbound SIP call (driver dialed to be offered exactly one trip) — no
    # ambiguity possible, resolve straight to it like before.
    outbound_trip = context.userdata.get("trip")
    if outbound_trip:
        target = outbound_trip
    else:
        trips = _pending_trips(context.userdata)
        if not trips:
            return "No trip is waiting for confirmation."

        trip_index = raw_arguments.get("trip_index")
        if len(trips) == 1:
            target = trips[0]
        elif trip_index is not None:
            idx = int(trip_index) - 1
            if idx < 0 or idx >= len(trips):
                return f"You have {len(trips)} trip(s) awaiting confirmation. Please choose 1 to {len(trips)}."
            target = trips[idx]
        else:
            lines = [
                f"{i}. {t.get('customer_name') or 'unnamed customer'} (pickup {short_address(t.get('pickup_address', ''), 30)})"
                for i, t in enumerate(trips, 1)
            ]
            return (
                "You have multiple trips awaiting confirmation — which one: "
                + "; ".join(lines)
                + "? Tell me the number or the customer's name."
            )

    trip_id = target["trip_id"]

    try:
        updated = await backend_api.update_trip_status(trip_id, "confirmed")
    except Exception:
        logger.error("confirm_trip failed", exc_info=True)
        return ERR_CANNOT_UPDATE

    fields = {k: v for k, v in updated.items() if k != "trip_id"}
    context_store.patch_trip_by_id(context.userdata, trip_id, **fields)

    customer = target.get("customer_name", "")
    msg = f"Trip with {customer} confirmed. Drive safe!" if customer else TRIP_CONFIRMED
    await context.session.say(msg, allow_interruptions=False)
    return "confirmed"
