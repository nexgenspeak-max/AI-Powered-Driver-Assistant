"""Central helpers — every tool returns ToolResponse via these entry points."""
from __future__ import annotations

from app.voicebot.prompts.tool_response import ToolResponse, wrap_spoken
from app.voicebot.processors import context_store


def lang_code(lang: str) -> str:
    return "en" if lang in ("en", "english") else "vi"


def trip_actions(trip_index: int | str | None = None, *, lang: str = "vi") -> list[str]:
    """Standard actionable follow-ups for a schedule trip."""
    idx = trip_index if trip_index is not None else "selected"
    if lang == "en":
        return [
            f"Call customer: call_customer(trip_index={idx}, mode=agent|bridge, message=optional)",
            f"SMS customer: send_sms_to_customer(trip_index={idx}, message=required)",
            f"Confirm offer: confirm_trip(trip_index={idx})",
            f"Reject offer: reject_trip(trip_index={idx})",
            f"Cancel trip: request_cancel_trip(trip_index={idx})",
            f"Traffic/ETA: get_trip_traffic(trip_index={idx})",
            f"Refresh data: refresh_latest_data()",
        ]
    return [
        f"Gọi khách: call_customer(trip_index={idx}, mode=agent|bridge, message=tùy chọn)",
        f"Nhắn khách: send_sms_to_customer(trip_index={idx}, message=bắt buộc)",
        f"Xác nhận nhận chuyến: confirm_trip(trip_index={idx})",
        f"Từ chối chuyến: reject_trip(trip_index={idx})",
        f"Hủy chuyến: request_cancel_trip(trip_index={idx})",
        f"Giao thông/ETA: get_trip_traffic(trip_index={idx})",
        f"Làm mới dữ liệu: refresh_latest_data()",
    ]


def contact_call_actions(*, lang: str = "vi") -> list[str]:
    if lang == "en":
        return [
            "Confirm call: confirm_contact_call()",
            "Pick from list: select_contact_match(name=...)",
            "Call custom number: call_custom_number(phone=..., message=optional)",
        ]
    return [
        "Xác nhận gọi: confirm_contact_call()",
        "Chọn trong danh sách: select_contact_match(name=...)",
        "Gọi số khác: call_custom_number(phone=..., message=tùy chọn)",
    ]


def contact_sms_actions(*, lang: str = "vi") -> list[str]:
    if lang == "en":
        return [
            "Confirm SMS: confirm_send_sms_to_contact(message=...)",
            "Pick from list: select_contact_match_for_sms(name=...)",
            "SMS custom number: confirm_send_sms_to_custom_number(message=...)",
        ]
    return [
        "Xác nhận nhắn: confirm_send_sms_to_contact(message=...)",
        "Chọn trong danh sách: select_contact_match_for_sms(name=...)",
        "Nhắn số khác: confirm_send_sms_to_custom_number(message=...)",
    ]


def call_follow_up_actions(*, lang: str = "vi") -> list[str]:
    if lang == "en":
        return [
            "Check call status: check_customer_call_status()",
            "Summarize call: summarize_last_call()",
        ]
    return [
        "Kiểm tra cuộc gọi: check_customer_call_status()",
        "Tóm tắt cuộc gọi: summarize_last_call()",
    ]


def customer_trip_actions(*, lang: str = "vi") -> list[str]:
    if lang == "en":
        return [
            "Call driver: call_driver()",
            "Cancel trip: cancel_my_trip()",
            "Book new trip: book_trip(...)",
        ]
    return [
        "Gọi tài xế: call_driver()",
        "Hủy chuyến: cancel_my_trip() / confirm_cancel_my_trip()",
        "Đặt chuyến mới: book_trip(...)",
    ]


def R(
    tool: str,
    spoken: str,
    *,
    lang: str = "vi",
    knowledge: list[str] | None = None,
    rules: list[str] | None = None,
    follow_up: list[str] | None = None,
    action: list[str] | None = None,
) -> ToolResponse:
    """Shorthand builder — use in every tool."""
    lc = lang_code(lang)
    return ToolResponse(
        tool=tool,
        lang=lc,
        knowledge_data=list(knowledge or []),
        response_rules=list(rules or []),
        response_knowledge=spoken,
        follow_up_knowledge=list(follow_up or []),
        action_knowledge=list(action or []),
    )


def coerce(
    tool: str,
    reply: str | ToolResponse,
    *,
    lang: str = "vi",
    knowledge: list[str] | None = None,
    follow_up: list[str] | None = None,
    action: list[str] | None = None,
) -> ToolResponse:
    if isinstance(reply, ToolResponse):
        return reply
    return R(
        tool,
        reply,
        lang=lang,
        knowledge=knowledge,
        follow_up=follow_up,
        action=action,
    )


def as_llm(userdata: dict, response: str | ToolResponse, *, tool: str = "", lang: str = "vi") -> str:
    """Store template and return XML string for LLM tool result."""
    resp = coerce(tool or "tool", response, lang=lang) if isinstance(response, str) else response
    context_store.set_last_tool_response(userdata, resp)
    return resp.to_template()
