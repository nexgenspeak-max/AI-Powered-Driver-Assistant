from livekit.agents import RunContext, function_tool
from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.locales.en.constants import TRIP_REJECTED, ERR_CANNOT_UPDATE
from app.voicebot.processors import context_store
from app.voicebot.processors.confirm_trip_flow import apply_and_speak
from app.voicebot.processors.tool_reply import R, trip_actions
from app.voicebot.processors.tool_response_builders import build_mutation_response, build_pending_confirm_response
from app.voicebot.processors.trip_format import short_address

# Mirrors check_upcoming_trips.py's own tuple — kept as a separate copy
# rather than importing it, same convention as elsewhere in this codebase.
AWAITING_CONFIRMATION_STATUSES = ("notified", "calling")


def _pending_trips(userdata: dict) -> list[dict]:
    return [
        t for t in context_store.get_schedule_trips(userdata)
        if t.get("status") in AWAITING_CONFIRMATION_STATUSES
    ]


def _pending_indices(trips: list[dict]) -> list[int]:
    return list(range(1, len(trips) + 1))


@function_tool(raw_schema=raw_schema["reject_trip"])
async def reject_trip(raw_arguments: dict, context: RunContext) -> str:
    # Outbound SIP call (driver dialed to be offered exactly one trip) — no
    # ambiguity possible, resolve straight to it like before.
    outbound_trip = context.userdata.get("trip")
    if outbound_trip:
        target = outbound_trip
    else:
        trips = _pending_trips(context.userdata)
        if not trips:
            return await context_store.speak_and_stop(
                context.session,
                R("reject_trip", "No trip is waiting for confirmation.", lang="en"),
            )

        trip_index = raw_arguments.get("trip_index")
        indices = _pending_indices(trips)
        if len(trips) == 1:
            target = trips[0]
        else:
            target = context_store.resolve_trip_from_subset(
                context.userdata, trips, raw_arguments
            )
            if target is None and trip_index is not None:
                idx = int(trip_index) - 1
                if idx < 0 or idx >= len(trips):
                    spoken = (
                        f"You have {len(trips)} trip(s) awaiting confirmation. "
                        f"Please choose 1 to {len(trips)}."
                    )
                    return await context_store.speak_and_stop(
                        context.session,
                        build_pending_confirm_response(
                            spoken,
                            tool="reject_trip",
                            lang="en",
                            trip_indices=indices,
                            confirm=False,
                        ),
                    )
                target = trips[idx]
            if target is None:
                lines = [
                    f"{i}. {t.get('customer_name') or 'unnamed customer'} (pickup {short_address(t.get('pickup_address', ''), 30)})"
                    for i, t in enumerate(trips, 1)
                ]
                spoken = (
                    "You have multiple trips awaiting confirmation — which one would you like to decline: "
                    + "; ".join(lines)
                    + "? Tell me the number or the customer's name."
                )
                return await context_store.speak_and_stop(
                    context.session,
                    build_pending_confirm_response(
                        spoken,
                        tool="reject_trip",
                        lang="en",
                        trip_indices=indices,
                        confirm=False,
                    ),
                )

    trip_id = target["trip_id"]
    context_store.set_last_tool_response(
        context.userdata,
        build_mutation_response(
            TRIP_REJECTED,
            tool="reject_trip",
            lang="en",
            knowledge=[f"trip_id: {trip_id}", f"status: rejected"],
            action=trip_actions(lang="en"),
        ),
    )
    return await apply_and_speak(
        context.session,
        context.userdata,
        trip_id,
        TRIP_REJECTED,
        error_reply=ERR_CANNOT_UPDATE,
        status="rejected",
    )
