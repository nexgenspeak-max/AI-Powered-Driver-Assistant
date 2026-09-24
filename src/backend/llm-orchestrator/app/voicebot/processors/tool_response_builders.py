"""ToolResponse builders for all driver/customer tools."""
from __future__ import annotations

from app.voicebot.processors.tool_reply import (
    R,
    call_follow_up_actions,
    contact_call_actions,
    contact_sms_actions,
    customer_trip_actions,
    lang_code,
    trip_actions,
)
from app.voicebot.processors.trip_format import format_route_order
from app.voicebot.prompts.tool_response import ToolResponse


def build_stats_response(data: dict, *, lang: str = "vi") -> ToolResponse:
    lc = lang_code(lang)
    if not data:
        empty = "No driver stats available yet." if lc == "en" else "Chưa có dữ liệu thống kê."
        return R("get_driver_stats", empty, lang=lc)

    rating = float(data.get("rating") or 0)
    accept_rate = float(data.get("acceptance_rate") or 0)
    complete = float(data.get("completion_rate") or 0)
    total = int(data.get("total_trips") or 0)

    if lc == "en":
        spoken = f"Rating: {rating:.1f}/5."
        if accept_rate:
            spoken += f" Acceptance rate: {accept_rate:.0f}%."
        if complete:
            spoken += f" Completion rate: {complete:.0f}%."
        if total:
            spoken += f" Total trips: {total}."
    else:
        spoken = f"Điểm đánh giá: {rating:.1f}/5."
        if accept_rate:
            spoken += f" Tỷ lệ chấp nhận: {accept_rate:.0f}%."
        if complete:
            spoken += f" Tỷ lệ hoàn thành: {complete:.0f}%."
        if total:
            spoken += f" Tổng chuyến: {total}."

    return R(
        "get_driver_stats",
        spoken,
        lang=lc,
        knowledge=[
            f"rating: {rating:.1f}",
            f"acceptance_rate: {accept_rate:.0f}%",
            f"completion_rate: {complete:.0f}%",
            f"total_trips: {total}",
        ],
        follow_up=[
            f"acceptance_rate: {accept_rate:.0f}%" if accept_rate else "acceptance_rate: -",
            f"completion_rate: {complete:.0f}%" if complete else "completion_rate: -",
        ],
        action=["refresh_latest_data(topic=driver_profile)"],
    )


def build_route_response(route: dict | None, *, lang: str = "vi") -> ToolResponse:
    lc = lang_code(lang)
    if not route:
        empty = (
            "You don't have multiple stops to order right now."
            if lc == "en"
            else "Hiện bạn không có nhiều điểm dừng cần sắp xếp thứ tự."
        )
        return R("get_optimal_route", empty, lang=lc)
    spoken = format_route_order(route, lang=lc)
    stops = route.get("stops") or []
    knowledge = [f"stop_count: {len(stops)}"]
    for i, s in enumerate(stops, 1):
        knowledge.append(f"stop_{i}: {s.get('kind')} {s.get('customer_name')} @ {s.get('address')}")
    return R(
        "get_optimal_route",
        spoken,
        lang=lc,
        knowledge=knowledge,
        follow_up=[f"source: {route.get('source', 'maps')}"],
        action=["refresh_latest_data(topic=optimal_route)", "suggest_next_stop()"],
    )


def build_location_response(address: str, *, lang: str = "vi", error: str = "") -> ToolResponse:
    lc = lang_code(lang)
    if error:
        return R("get_customer_location", error, lang=lc)
    spoken = (
        f"Customer is at the pickup point: {address}."
        if lc == "en"
        else f"Khách hàng ở điểm đón: {address}."
    )
    return R(
        "get_customer_location",
        spoken,
        lang=lc,
        knowledge=[f"pickup_address: {address}"],
        action=trip_actions(lang=lc) + ["get_trip_traffic()"],
    )


def build_customer_eta_response(trip: dict | None, *, lang: str = "vi", error: str = "") -> ToolResponse:
    lc = lang_code(lang)
    if error:
        return R("get_driver_eta", error, lang=lc, action=customer_trip_actions(lang=lc))
    eta = trip.get("eta_minutes") if trip else None
    if not eta or int(eta) <= 0:
        spoken = (
            "Your driver has accepted the trip and is on the way."
            if lc == "en"
            else "Tài xế đã xác nhận nhận chuyến và đang trên đường đến."
        )
    else:
        spoken = (
            f"Your driver is expected to arrive in about {eta} minutes."
            if lc == "en"
            else f"Tài xế dự kiến đến trong khoảng {eta} phút nữa."
        )
    return R(
        "get_driver_eta",
        spoken,
        lang=lc,
        knowledge=[f"eta_minutes: {eta or '-'}", f"status: {(trip or {}).get('status', '-')}"],
        action=customer_trip_actions(lang=lc),
    )


def build_my_trip_response(trip: dict | None, *, lang: str = "vi", error: str = "") -> ToolResponse:
    lc = lang_code(lang)
    if error or not trip:
        return R("get_my_trip", error or "No trip.", lang=lc, action=customer_trip_actions(lang=lc))

    from app.voicebot.locales.vn.constants import TRIP_STATUS_MAP

    status_txt = TRIP_STATUS_MAP.get(trip.get("status", ""), trip.get("status", ""))
    eta = trip.get("eta_minutes")
    if lc == "en":
        spoken = (
            f"Your trip: {status_txt}. Pickup at {trip.get('pickup_address', '')}, "
            f"dropoff at {trip.get('dropoff_address', '')}."
        )
    else:
        spoken = (
            f"Chuyến của bạn: {status_txt}. "
            f"Đón tại {trip.get('pickup_address', '')}, đến {trip.get('dropoff_address', '')}."
        )
    if eta and int(eta) > 0:
        spoken += (
            f" Driver ETA: about {eta} minutes."
            if lc == "en"
            else f" Tài xế sẽ đến trong khoảng {eta} phút."
        )
    if trip.get("driver_phone"):
        spoken += (
            f" Driver phone: {trip['driver_phone']}."
            if lc == "en"
            else f" Tài xế: {trip['driver_phone']}."
        )

    return R(
        "get_my_trip",
        spoken,
        lang=lc,
        knowledge=[
            f"status: {trip.get('status')}",
            f"pickup: {trip.get('pickup_address', '')}",
            f"dropoff: {trip.get('dropoff_address', '')}",
            f"eta_minutes: {eta or '-'}",
            f"driver_phone: {trip.get('driver_phone') or '-'}",
        ],
        action=customer_trip_actions(lang=lc),
    )


def build_call_status_response(
    *,
    lang: str = "vi",
    status: str = "",
    summary: str = "",
    error: str = "",
) -> ToolResponse:
    lc = lang_code(lang)
    if error:
        return R("check_customer_call_status", error, lang=lc, action=call_follow_up_actions(lang=lc))
    if status == "in_progress":
        spoken = (
            "The AI is still on the call with the customer. "
            "You can keep asking other questions — say 'summarize the call' when you want the result."
            if lc == "en"
            else "AI vẫn đang gọi khách. Bạn có thể hỏi việc khác — khi cần tóm tắt, nói 'tóm tắt cuộc gọi'."
        )
    elif summary:
        spoken = (
            f"The customer call is finished. Summary: {summary}"
            if lc == "en"
            else f"Cuộc gọi khách đã xong. Tóm tắt: {summary}"
        )
    else:
        spoken = "No recent customer call found." if lc == "en" else "Không có cuộc gọi khách gần đây."

    return R(
        "check_customer_call_status",
        spoken,
        lang=lc,
        knowledge=[f"status: {status or '-'}", f"summary: {summary or '-'}"],
        follow_up=[f"summary: {summary}"] if summary else [],
        action=call_follow_up_actions(lang=lc),
    )


def build_summarize_call_response(
    spoken: str,
    *,
    lang: str = "vi",
    summary: str = "",
    in_progress: bool = False,
) -> ToolResponse:
    lc = lang_code(lang)
    action = call_follow_up_actions(lang=lc)
    if in_progress:
        action = ["check_customer_call_status()"] + action
    return R(
        "summarize_last_call",
        spoken,
        lang=lc,
        knowledge=[f"summary: {summary or '-'}", f"in_progress: {in_progress}"],
        follow_up=[f"summary: {summary}"] if summary else [],
        action=action,
    )


def build_next_stop_response(spoken: str, *, lang: str = "vi") -> ToolResponse:
    lc = lang_code(lang)
    return R(
        "suggest_next_stop",
        spoken,
        lang=lc,
        action=trip_actions(lang=lc) + ["get_optimal_route()", "get_trip_traffic()"],
    )


def build_driver_status_response(online: bool, *, lang: str = "vi") -> ToolResponse:
    lc = lang_code(lang)
    if online:
        spoken = (
            "You're now online and ready to receive trips. Drive safe!"
            if lc == "en"
            else "Đã bật trạng thái nhận chuyến. Chúc bạn có nhiều chuyến tốt!"
        )
    else:
        spoken = (
            "You're now offline. You won't receive new trips."
            if lc == "en"
            else "Đã chuyển sang chế độ nghỉ. Bạn sẽ không nhận chuyến mới."
        )
    return R(
        "set_driver_status",
        spoken,
        lang=lc,
        knowledge=[f"online: {online}"],
        action=["set_driver_status(online=true|false)"],
    )


def build_contact_find_response(
    spoken: str,
    *,
    tool: str,
    lang: str = "vi",
    matches: list[dict] | None = None,
    for_sms: bool = False,
) -> ToolResponse:
    lc = lang_code(lang)
    knowledge = []
    for i, m in enumerate(matches or [], 1):
        knowledge.append(f"match_{i}: {m.get('name')} ({m.get('phone_number', '')})")
    actions = contact_sms_actions(lang=lc) if for_sms else contact_call_actions(lang=lc)
    return R("find_contact_to_message" if for_sms else "find_contact", spoken, lang=lc, knowledge=knowledge, action=actions)


def build_contact_pick_response(
    spoken: str,
    *,
    tool: str,
    lang: str = "vi",
    for_sms: bool = False,
) -> ToolResponse:
    lc = lang_code(lang)
    actions = contact_sms_actions(lang=lc) if for_sms else contact_call_actions(lang=lc)
    return R(tool, spoken, lang=lc, action=actions)


def build_pending_confirm_response(
    spoken: str,
    *,
    tool: str,
    lang: str = "vi",
    trip_indices: list[int] | None = None,
    confirm: bool = True,
) -> ToolResponse:
    lc = lang_code(lang)
    knowledge = [f"pending_count: {len(trip_indices or [])}"]
    actions = []
    for idx in trip_indices or []:
        actions.append(
            f"confirm_trip(trip_index={idx})" if confirm else f"reject_trip(trip_index={idx})"
        )
    return R(tool, spoken, lang=lc, knowledge=knowledge, action=actions or trip_actions(lang=lc))


def build_mutation_response(
    spoken: str,
    *,
    tool: str,
    lang: str = "vi",
    knowledge: list[str] | None = None,
    action: list[str] | None = None,
) -> ToolResponse:
    return R(tool, spoken, lang=lang_code(lang), knowledge=knowledge, action=action or [])


def build_faq_response(spoken: str, *, lang: str = "vi", question: str = "") -> ToolResponse:
    lc = lang_code(lang)
    return R(
        "answer_app_faq",
        spoken,
        lang=lc,
        knowledge=[f"question: {question}"] if question else [],
        action=["answer_app_faq(question=...) for another app question"],
    )
