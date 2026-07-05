import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.services import backend_api
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.en.tools.report_trip_issue")

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

    current = context_store.get_current_trip(context.userdata)
    if not current:
        return "No active trip to report an issue for."

    trip_id = current["trip_id"]
    issue = {"issue_type": issue_type, "description": description}
    context_store.patch_current_trip(context.userdata, last_issue=issue)

    async def _sync() -> None:
        try:
            await backend_api.report_trip_issue(
                trip_id=trip_id,
                driver_phone=driver_phone,
                issue_type=issue_type,
                description=description,
            )
        except Exception:
            logger.error("report_trip_issue failed", exc_info=True)

    context_store.schedule_sync(_sync())
    label = _ISSUE_LABELS.get(issue_type, issue_type)
    return (
        f"Issue recorded: {label}. "
        "Support will review and contact you if more information is needed."
    )
