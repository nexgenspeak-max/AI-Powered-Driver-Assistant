import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.locales.en.constants import ERR_REPORT_ISSUE_FAIL
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_response_builders import build_mutation_response
from app.voicebot.processors.tool_reply import trip_actions

logger = logging.getLogger("llm-orchestrator.en.tools.report_trip_issue")

_ISSUE_LABELS = {
    "safety_concern": "safety concern",
    "vehicle_damage": "vehicle damage",
    "inappropriate_behavior": "inappropriate behavior",
    "wrong_address": "wrong address",
    "other": "other issue",
}


@function_tool(raw_schema=raw_schema["report_trip_issue"])
async def report_trip_issue(raw_arguments: dict, context: RunContext) -> str:
    issue_type = raw_arguments.get("issue_type", "other")
    description = raw_arguments.get("description") or ""
    driver_phone = context.userdata["driver_phone"]
    actions = trip_actions(lang="en")

    trip = context_store.resolve_customer_trip(context.userdata, raw_arguments)
    if not trip:
        return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
                "No active trip to report an issue for.",
                tool="report_trip_issue",
                lang="en",
                action=actions,
            ),
        )

    trip_id = trip["trip_id"]

    try:
        await backend_api.report_trip_issue(
            trip_id=trip_id,
            driver_phone=driver_phone,
            issue_type=issue_type,
            description=description,
        )
    except Exception:
        logger.error("report_trip_issue failed", exc_info=True)
        return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
                ERR_REPORT_ISSUE_FAIL,
                tool="report_trip_issue",
                lang="en",
                action=actions,
            ),
        )

    issue = {"issue_type": issue_type, "description": description}
    context_store.patch_current_trip(context.userdata, last_issue=issue)
    label = _ISSUE_LABELS.get(issue_type, issue_type)
    spoken = f"Issue recorded: {label}."
    return await context_store.speak_and_stop(
        context.session,
        build_mutation_response(
            spoken,
            tool="report_trip_issue",
            lang="en",
            knowledge=[
                f"trip_id: {trip_id}",
                f"issue_type: {issue_type}",
                f"description: {description or '-'}",
            ],
            action=actions,
        ),
    )
