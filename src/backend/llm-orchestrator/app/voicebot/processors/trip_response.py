"""Build ToolResponse objects for trip-related tools."""
from __future__ import annotations

from app.voicebot.prompts.tool_response import ToolResponse
from app.voicebot.processors.tool_reply import trip_actions
from app.voicebot.processors.trip_format import (
    MAX_LIST,
    estimated_fare,
    fmt_money,
    format_trip_count_summary,
    format_trip_detail,
    format_trip_existence,
    format_trip_list,
    format_traffic_info,
    format_driver_leg,
    trip_extras,
    status_phrase,
    _needs_schedule_confirm,
)


def _trip_knowledge_rows(trip: dict, index: int, lang: str) -> list[str]:
    pickup_full = (trip.get("pickup_address") or "").strip()
    dropoff_full = (trip.get("dropoff_address") or "").strip()
    rows = [
        f"trip_index: {index}",
        f"trip_id: {trip.get('trip_id', '')}",
        f"customer_name: {trip.get('customer_name') or ('khách' if lang != 'en' else 'customer')}",
        f"pickup_address: {pickup_full}",
        f"dropoff_address: {dropoff_full}",
        f"pickup_time: {trip.get('pickup_time') or '-'}",
        f"estimated_fare: {fmt_money(estimated_fare(trip), lang)}",
        f"distance_km: {trip.get('distance_km') or '-'}",
        f"eta_minutes: {trip.get('eta_minutes') or '-'}",
        f"status: {status_phrase(trip.get('status', ''), lang)}",
    ]
    phone = (trip.get("customer_phone") or "").strip()
    if phone:
        rows.append(f"customer_phone: {phone}")
    rows.append(f"has_bulky_goods: {'yes' if trip.get('has_bulky_goods') else 'no'}")
    rows.append(f"with_children: {'yes' if trip.get('with_children') else 'no'}")
    note = (trip.get("note") or "").strip()
    if note:
        rows.append(f"customer_note: {note}")
    traffic = (trip.get("traffic_note") or "").strip()
    if traffic:
        rows.append(f"traffic: {traffic}")
    route = (trip.get("route_summary") or "").strip()
    if route:
        rows.append(f"route: {route}")
    return rows


def _trip_follow_up_rows(trip: dict, index: int, lang: str) -> list[str]:
    """Labeled follow-up rows — full trip fields for LLM partial answers."""
    customer = trip.get("customer_name") or ("khách" if lang != "en" else "customer")
    time = (trip.get("pickup_time") or "").strip()
    prefix = f"Chuyến {index}" if lang != "en" else f"Trip {index}"
    rows: list[str] = []

    rows.append(f"{prefix} — khách: {customer}" if lang != "en" else f"{prefix} — customer: {customer}")
    if trip.get("pickup_address"):
        rows.append(
            f"{prefix} — điểm đón: {trip['pickup_address']}"
            if lang != "en"
            else f"{prefix} — pickup: {trip['pickup_address']}"
        )
    if trip.get("dropoff_address"):
        rows.append(
            f"{prefix} — điểm trả: {trip['dropoff_address']}"
            if lang != "en"
            else f"{prefix} — dropoff: {trip['dropoff_address']}"
        )
    if time:
        rows.append(
            f"{prefix} — giờ đón: {time}" if lang != "en" else f"{prefix} — pickup time: {time}"
        )
    fare = fmt_money(estimated_fare(trip), lang)
    rows.append(f"{prefix} — giá: {fare}" if lang != "en" else f"{prefix} — fare: {fare}")
    extras = trip_extras(trip, lang)
    rows.append(
        f"{prefix} — hành lý/trẻ em/ghi chú: {extras or 'không có'}"
        if lang != "en"
        else f"{prefix} — luggage/children/note: {extras or 'none'}"
    )
    phone = (trip.get("customer_phone") or "").strip()
    if phone:
        rows.append(
            f"{prefix} — số điện thoại: {phone}"
            if lang != "en"
            else f"{prefix} — phone: {phone}"
        )
    status = (trip.get("status") or "").strip()
    if status:
        rows.append(
            f"{prefix} — trạng thái: {status_phrase(status, lang)}"
            if lang != "en"
            else f"{prefix} — status: {status_phrase(status, lang)}"
        )
    km = trip.get("distance_km")
    if km:
        rows.append(
            f"{prefix} — quãng đường: {km} km" if lang != "en" else f"{prefix} — distance: {km} km"
        )
    eta = trip.get("eta_minutes")
    if eta:
        rows.append(
            f"{prefix} — dự kiến: {eta} phút" if lang != "en" else f"{prefix} — ETA: {eta} min"
        )
    traffic = (trip.get("traffic_note") or "").strip()
    if traffic:
        rows.append(
            f"{prefix} — giao thông: {traffic}" if lang != "en" else f"{prefix} — traffic: {traffic}"
        )
    route = (trip.get("route_summary") or "").strip()
    if route:
        rows.append(
            f"{prefix} — tuyến: {route}" if lang != "en" else f"{prefix} — route: {route}"
        )
    if _needs_schedule_confirm(trip) and time:
        rows.append(
            f"{prefix} — chuyến hẹn giờ lúc {time}, đang chờ xác nhận"
            if lang != "en"
            else f"{prefix} — scheduled pickup at {time}, awaiting confirmation"
        )
    return rows


def _multi_trip_knowledge(trips: list[dict], lang: str) -> tuple[list[str], list[str]]:
    """KnowledgeData + FollowUpKnowledge for a trip list — one source per field."""
    knowledge = [f"trip_count: {len(trips)}"]
    follow_up: list[str] = []
    for i, trip in enumerate(trips[:MAX_LIST], 1):
        knowledge.append(f"--- trip_{i} ---")
        knowledge.extend(_trip_knowledge_rows(trip, i, lang))
        follow_up.extend(_trip_follow_up_rows(trip, i, lang))
    if len(trips) > MAX_LIST:
        extra = (
            f"Còn {len(trips) - MAX_LIST} chuyến nữa — hỏi số thứ tự hoặc list_all"
            if lang != "en"
            else f"{len(trips) - MAX_LIST} more trips — ask by number or list_all"
        )
        follow_up.append(extra)
    return knowledge, follow_up


def build_trip_detail_response(trip: dict, index: int, lang: str = "vi") -> ToolResponse:
    spoken = format_trip_detail(trip, index, lang)
    follow_up = _trip_follow_up_rows(trip, index, lang)
    follow_up.append(
        f"Chuyến {index} đang được chọn làm selected trip — gọi/SMS/ETA follow-up áp dụng chuyến này"
        if lang != "en"
        else f"Trip {index} is the selected trip — call/SMS/ETA follow-ups apply to this trip"
    )

    rules = (
        [
            "Một câu ngắn — chỉ tên khách và điểm đón",
            "Follow-up một phần: chỉ trả đúng phần được hỏi (đón ở đâu → điểm đón; giá → giá)",
            "Chi tiết đầy đủ nằm ở FollowUpKnowledge — không gọi lại check_upcoming_trips",
        ]
        if lang != "en"
        else [
            "One short sentence — customer name and pickup only",
            "Partial follow-ups: answer only what was asked (pickup? → pickup; fare? → fare)",
            "Full detail is in FollowUpKnowledge — do not re-call check_upcoming_trips",
        ]
    )

    return ToolResponse(
        tool="check_upcoming_trips",
        lang="vi" if lang != "en" else "en",
        knowledge_data=_trip_knowledge_rows(trip, index, lang),
        response_rules=rules,
        response_knowledge=spoken,
        follow_up_knowledge=follow_up,
        action_knowledge=trip_actions(index, lang="en" if lang == "en" else "vi"),
    )


def build_trip_count_response(
    trips: list[dict],
    lang: str = "vi",
    *,
    scope_label: str | None = None,
) -> ToolResponse:
    if len(trips) == 1:
        resp = build_trip_detail_response(trips[0], 1, lang)
        resp.response_knowledge = format_trip_existence(trips[0], lang)
        return resp

    spoken = format_trip_count_summary(trips, lang, scope_label=scope_label)
    knowledge, follow_up = _multi_trip_knowledge(trips, lang)
    follow_up.append(
        "Hỏi chi tiết: trả một trường từ FollowUpKnowledge hoặc check_upcoming_trips(trip_index=N)"
        if lang != "en"
        else "For detail: one field from FollowUpKnowledge or check_upcoming_trips(trip_index=N)"
    )
    rules = (
        [
            "Chỉ nói số lượng hoặc tên khách — không đọc danh sách dài",
            "Follow-up một phần: đón/trả/giá/số → trả một trường từ FollowUpKnowledge",
        ]
        if lang != "en"
        else [
            "Count or customer name only — do not read a long list",
            "Partial follow-ups: pickup/dropoff/fare/phone → one field from FollowUpKnowledge",
        ]
    )
    return ToolResponse(
        tool="check_upcoming_trips",
        lang="vi" if lang != "en" else "en",
        knowledge_data=knowledge,
        response_rules=rules,
        response_knowledge=spoken,
        follow_up_knowledge=follow_up,
        action_knowledge=[
            "Chi tiết chuyến: check_upcoming_trips(trip_index=N)"
            if lang != "en"
            else "Trip detail: check_upcoming_trips(trip_index=N)",
        ] + trip_actions(lang="en" if lang == "en" else "vi"),
    )


def build_trip_list_response(trips: list[dict], lang: str = "vi") -> ToolResponse:
    if len(trips) == 1:
        resp = build_trip_detail_response(trips[0], 1, lang)
        resp.response_knowledge = format_trip_existence(trips[0], lang)
        return resp

    spoken = format_trip_list(trips, lang)
    knowledge, follow_up = _multi_trip_knowledge(trips, lang)
    return ToolResponse(
        tool="check_upcoming_trips",
        lang="vi" if lang != "en" else "en",
        knowledge_data=knowledge,
        response_rules=[
            "Đã đọc danh sách — follow-up theo số thứ tự từ FollowUpKnowledge"
            if lang != "en"
            else "List was read — numbered follow-ups use FollowUpKnowledge",
        ],
        response_knowledge=spoken,
        follow_up_knowledge=follow_up,
        action_knowledge=trip_actions(lang="en" if lang == "en" else "vi"),
    )


def build_current_trip_response(
    trip: dict, lang: str = "vi", *, prefix: str = "", leg: dict | None = None,
) -> ToolResponse:
    detail = build_trip_detail_response(trip, 1, lang)
    leg_line = format_driver_leg(leg, lang)
    if leg_line:
        detail.follow_up_knowledge = [*detail.follow_up_knowledge, f"driver_to_next_stop: {leg_line}"]
    if prefix:
        detail.response_knowledge = prefix + detail.response_knowledge
        detail.tool = "get_current_trip_info"
    else:
        detail.tool = "get_current_trip_info"
    return detail


def build_traffic_response(trip: dict, lang: str = "vi", leg: dict | None = None) -> ToolResponse:
    spoken = format_traffic_info(trip, lang, leg)
    index_hint = trip.get("trip_id") or ""
    return ToolResponse(
        tool="get_trip_traffic",
        lang="vi" if lang != "en" else "en",
        knowledge_data=_trip_knowledge_rows(trip, 1, lang),
        response_rules=[
            "Nhấn tình trạng giao thông và ETA" if lang != "en" else "Emphasize traffic and ETA",
        ],
        response_knowledge=spoken,
        follow_up_knowledge=[
            f"traffic_note: {trip.get('traffic_note') or '-'}",
            f"route_summary: {trip.get('route_summary') or '-'}",
            f"eta_minutes: {trip.get('eta_minutes') or '-'}",
            f"driver_to_next_stop: {format_driver_leg(leg, lang) or '-'}",
            f"trip_id: {index_hint}",
        ],
        action_knowledge=trip_actions(lang="en" if lang == "en" else "vi"),
    )


def build_earnings_response(data: dict, lang: str = "vi") -> ToolResponse:
    money_lang = "en" if lang == "en" else "vi"
    total = int(data.get("total_earnings") or 0)
    trips = int(data.get("trip_count") or 0)
    bonus = int(data.get("bonus_earnings") or 0)
    hours = float(data.get("hours_online") or 0)

    if lang == "en":
        spoken = f"Today: {trips} trip(s), earnings {fmt_money(total, money_lang)}."
        empty = "No earnings data for today yet."
    else:
        spoken = f"Hôm nay {trips} chuyến, thu nhập {fmt_money(total, money_lang)}."
        empty = "Chưa có dữ liệu thu nhập hôm nay."

    if not data:
        return ToolResponse.simple(tool="get_today_earnings", spoken=empty, lang=money_lang)

    return ToolResponse(
        tool="get_today_earnings",
        lang=money_lang,
        knowledge_data=[
            f"trip_count: {trips}",
            f"total_earnings: {fmt_money(total, money_lang)}",
            f"bonus_earnings: {fmt_money(bonus, money_lang)}",
            f"hours_online: {hours:.1f}",
        ],
        response_rules=[
            "Nhấn tổng thu nhập và số chuyến" if lang != "en" else "Lead with total earnings and trip count",
        ],
        response_knowledge=spoken,
        follow_up_knowledge=[
            f"bonus: {fmt_money(bonus, money_lang)}" if bonus else "bonus: 0",
            f"hours_online: {hours:.1f}" if hours else "hours_online: -",
            "Làm mới: refresh_latest_data(topic=today_earnings)" if lang != "en" else "Refresh: refresh_latest_data(topic=today_earnings)",
        ],
    )


def build_bonus_response(bonuses: list[dict], lang: str = "vi") -> ToolResponse:
    if not bonuses:
        empty = (
            "Hiện không có chương trình thưởng hay vùng tăng giá nào đang hoạt động."
            if lang != "en"
            else "No active bonus or surge programs right now."
        )
        return ToolResponse.simple(tool="get_bonus_info", spoken=empty, lang="vi" if lang != "en" else "en")

    lines = []
    knowledge = []
    for i, b in enumerate(bonuses, 1):
        desc = b.get("description", "")
        amount = b.get("amount", "")
        expire = b.get("expires_at", "")
        line = desc
        if amount:
            line += f" (+{amount})"
        if expire:
            line += f" (hết hạn {expire})" if lang != "en" else f" (expires {expire})"
        lines.append(line)
        knowledge.append(f"bonus_{i}: {line}")

    spoken = (
        "Thưởng đang hoạt động: " + "; ".join(lines) + "."
        if lang != "en"
        else "Active bonuses: " + "; ".join(lines) + "."
    )
    return ToolResponse(
        tool="get_bonus_info",
        lang="vi" if lang != "en" else "en",
        knowledge_data=knowledge,
        response_knowledge=spoken,
        follow_up_knowledge=lines,
    )
