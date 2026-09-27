import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.locales.en.constants import ERR_NO_SHOW_FAIL
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_response_builders import build_mutation_response
from app.voicebot.processors.tool_reply import trip_actions

logger = logging.getLogger("llm-orchestrator.en.tools.report_customer_no_show")


@function_tool(raw_schema=raw_schema["report_customer_no_show"])
async def report_customer_no_show(raw_arguments: dict, context: RunContext) -> str:
    actions = trip_actions(lang="en")
    trip = context_store.resolve_customer_trip(context.userdata, raw_arguments)
    if not trip:
        return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
                "No active trip found.",
                tool="report_customer_no_show",
                lang="en",
                action=actions,
            ),
        )

    customer = trip.get("customer_name", "the customer")
    context.userdata["pending_no_show_trip_id"] = trip["trip_id"]
    context_store.set_pending_driver_action(
        context.userdata,
        "no_show",
        {"trip_id": trip["trip_id"]},
        source="report_customer_no_show",
    )
    spoken = (
        f"Are you sure you want to report that {customer} did not show up? "
        "Say yes to confirm."
    )
    return await context_store.speak_and_stop(
        context.session,
        build_mutation_response(
            spoken,
            tool="report_customer_no_show",
            lang="en",
            knowledge=[f"trip_id: {trip['trip_id']}"],
            action=["wait for yes"],
        ),
    )


async def commit_customer_no_show(raw_arguments: dict, context: RunContext) -> str:
    driver_phone = context.userdata["driver_phone"]
    actions = trip_actions(lang="en")
    trip = context_store.resolve_customer_trip(context.userdata, raw_arguments)
    trip_id = (
        raw_arguments.get("trip_id")
        or context.userdata.get("pending_no_show_trip_id")
        or (trip or {}).get("trip_id")
    )
    if not trip or not trip_id:
        return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
                "No active trip found.",
                tool="report_customer_no_show",
                lang="en",
                action=actions,
            ),
        )

    customer = trip.get("customer_name", "the customer")
    try:
        await backend_api.report_no_show(trip_id, driver_phone)
    except Exception:
        logger.error("commit_customer_no_show failed", exc_info=True)
        return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
                ERR_NO_SHOW_FAIL,
                tool="report_customer_no_show",
                lang="en",
                action=actions,
            ),
        )

    context.userdata["pending_no_show_trip_id"] = None
    context_store.patch_current_trip(context.userdata, status="no_show")
    context_store.set_current_trip(context.userdata, None)
    context_store.remove_trip_from_lists(context.userdata, trip_id)
    spoken = f"Reported that {customer} did not show up."
    return await context_store.speak_and_stop(
        context.session,
        build_mutation_response(
            spoken,
            tool="report_customer_no_show",
            lang="en",
            knowledge=[f"trip_id: {trip_id}", "status: no_show"],
            action=actions,
        ),
    )
