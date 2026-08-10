import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.en.constants import ERR_NO_ACTIVE_DRIVER
from app.voicebot.processors import context_store, customer_call
from app.voicebot.processors.trip_format import short_address

logger = logging.getLogger("voice-agent.en.tools.call_customer")


@function_tool(raw_schema=raw_schema["call_customer"])
async def call_customer(raw_arguments: dict, context: RunContext):
    mode = raw_arguments.get("mode", "bridge")
    trip_index = raw_arguments.get("trip_index")
    message = (raw_arguments.get("message") or "").strip()

    trips = context_store.get_callable_trips(context.userdata)
    if not trips:
        current = context_store.get_current_trip(context.userdata)
        if not current:
            return ERR_NO_ACTIVE_DRIVER
        trips = [current]

    # One-shot: which trip a just-delivered proximity nudge was about, if
    # any (see agent.py/session.py's set_last_nudge_trip). Read unconditionally
    # so it never lingers to wrongly auto-resolve some later, unrelated
    # disambiguation — only actually used below when trips are ambiguous.
    nudge_trip_id = context_store.pop_last_nudge_trip(context.userdata)

    if len(trips) == 1:
        target = trips[0]
    elif trip_index is not None:
        idx = int(trip_index) - 1
        if idx < 0 or idx >= len(trips):
            return f"You only have {len(trips)} trip(s). Please choose 1 to {len(trips)}."
        target = trips[idx]
    elif nudge_trip_id and any(t.get("trip_id") == nudge_trip_id for t in trips):
        # Driver said yes right after "would you like me to call the
        # customer" — the trip is already known from the nudge, don't re-ask.
        target = next(t for t in trips if t.get("trip_id") == nudge_trip_id)
    else:
        lines = [
            f"{i}. {t.get('customer_name') or 'unnamed customer'} (pickup {short_address(t.get('pickup_address', ''), 30)})"
            for i, t in enumerate(trips, 1)
        ]
        return (
            "You have multiple trips right now — which customer would you like to call: "
            + "; ".join(lines)
            + "? Tell me the number or the customer's name."
        )

    if mode == "agent":
        return await customer_call.start_in_room_agent_call(context, target, lang="en", custom_message=message)
    if mode == "bridge":
        return await customer_call.start_in_room_bridge_call(context, target, lang="en")
    if mode == "background":
        return await customer_call.start_background_call(context, target, lang="en")

    return "Invalid call mode. Choose agent or bridge."
