import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.locales.vn.constants import ERR_REPORT_ISSUE_FAIL
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_reply import trip_actions
from app.voicebot.processors.tool_response_builders import build_mutation_response

logger = logging.getLogger("llm-orchestrator.vn.tools.report_trip_issue")

_ISSUE_LABELS = {
    "safety_concern": "lo ngại an toàn",
    "vehicle_damage": "hư hỏng xe",
    "inappropriate_behavior": "hành vi không phù hợp",
    "wrong_address": "địa chỉ sai",
    "other": "vấn đề khác",
}


@function_tool(raw_schema=raw_schema["report_trip_issue"])
async def report_trip_issue(raw_arguments: dict, context: RunContext) -> str:
    issue_type = raw_arguments.get("issue_type", "other")
    description = raw_arguments.get("description") or ""
    driver_phone = context.userdata["driver_phone"]
    actions = trip_actions(lang="vi")

    trip = context_store.resolve_customer_trip(context.userdata, raw_arguments)
    if not trip:
        return await context_store.speak_and_stop(
            context.session,
            build_mutation_response(
                "Không có chuyến đang hoạt động để báo cáo.",
                tool="report_trip_issue",
                lang="vi",
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
                lang="vi",
                action=actions,
            ),
        )

    issue = {"issue_type": issue_type, "description": description}
    context_store.patch_current_trip(context.userdata, last_issue=issue)
    label = _ISSUE_LABELS.get(issue_type, issue_type)
    spoken = f"Đã ghi nhận báo cáo sự cố: {label}."
    return await context_store.speak_and_stop(
        context.session,
        build_mutation_response(
            spoken,
            tool="report_trip_issue",
            lang="vi",
            knowledge=[f"trip_id: {trip_id}", f"issue_type: {issue_type}"],
            action=actions,
        ),
    )
