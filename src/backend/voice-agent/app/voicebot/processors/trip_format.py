"""Format trip data for voice responses — short addresses, fare, list/detail."""
from __future__ import annotations

BASE_FARE = 15_000
FARE_PER_KM = 12_000
MAX_LIST = 5


def estimated_fare(trip: dict) -> int:
    if trip.get("estimated_fare") is not None:
        return int(trip["estimated_fare"])
    km = float(trip.get("distance_km") or 0)
    return round(BASE_FARE + km * FARE_PER_KM)


def fmt_money(amount: int, lang: str) -> str:
    # Always the exact figure — "X nghìn"/"X.Y triệu" shorthand used to round/
    # truncate (e.g. 15.500đ -> "15 nghìn đ" silently drops the 500), and the
    # driver needs the real fare read out, not an approximation.
    if lang == "en":
        return f"{amount:,} VND"
    return f"{amount:,}".replace(",", ".") + "đ"


def short_address(address: str, max_len: int = 48) -> str:
    if not address:
        return ""
    text = address.strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 3].rstrip() + "..."


def build_outbound_nav_info(trip: dict, lang: str) -> str:
    """Navigation/fare lines for outbound trip notification prompts."""
    lines: list[str] = []
    fare_label = "Estimated fare" if lang == "en" else "Giá ước tính"
    lines.append(f"- {fare_label}: {fmt_money(estimated_fare(trip), lang)}")

    eta = trip.get("eta_minutes")
    distance = trip.get("distance_km")
    if eta:
        if lang == "en":
            lines.append(f"- Distance: {distance} km, estimated {eta} minutes")
        else:
            lines.append(f"- Quãng đường: {distance} km, dự kiến {eta} phút")

    traffic = trip.get("traffic_note")
    if traffic:
        label = "Traffic" if lang == "en" else "Giao thông"
        lines.append(f"- {label}: {traffic}")

    route = trip.get("route_summary")
    if route:
        label = "Route" if lang == "en" else "Tuyến đường"
        lines.append(f"- {label}: {route}")

    return "\n".join(lines)


def format_traffic_info(trip: dict, lang: str = "vi") -> str:
    """Traffic / route summary for voice — reads prefetched Google Maps data."""
    traffic = (trip.get("traffic_note") or "").strip()
    route = (trip.get("route_summary") or "").strip()
    eta = trip.get("eta_minutes")
    km = trip.get("distance_km")
    pickup = short_address(trip.get("pickup_address", ""), 40)
    dropoff = short_address(trip.get("dropoff_address", ""), 40)

    if not traffic and not route and not eta:
        if lang == "en":
            return (
                "No live traffic data for this trip yet. "
                "Use Google Maps or Waze for turn-by-turn navigation."
            )
        return (
            "Chưa có dữ liệu giao thông cho chuyến này. "
            "Anh/chị dùng Google Maps hoặc Waze để xem đường chi tiết."
        )

    if lang == "en":
        msg = f"Route {pickup} to {dropoff}."
        if traffic:
            msg += f" Traffic: {traffic}."
        elif eta:
            msg += " Traffic looks normal."
        if route:
            msg += f" Via {route}."
        if eta:
            msg += f" Estimated {eta} minutes"
            if km:
                msg += f", {km} km"
            msg += "."
        return msg

    msg = f"Tuyến {pickup} đến {dropoff}."
    if traffic:
        msg += f" {traffic}."
    elif eta:
        msg += " Giao thông bình thường."
    if route:
        msg += f" Đi qua {route}."
    if eta:
        msg += f" Dự kiến {eta} phút"
        if km:
            msg += f", {km} km"
        msg += "."
    return msg


_UNCONFIRMED_STATUSES = ("pending", "notified", "calling")

# Spoken-language status — a driver has no idea what "notified" or
# "arrived_pickup" means read out loud; describe where the trip actually is
# in the pickup→dropoff sequence instead of the raw backend status code.
_STATUS_PHRASES_VI = {
    "pending": "vừa được tạo, đang chờ hệ thống liên hệ",
    "notified": "chưa xác nhận, đang chờ anh/chị đồng ý",
    "calling": "chưa xác nhận, đang chờ anh/chị đồng ý",
    "confirmed": "đã xác nhận, đang trên đường đến điểm đón",
    "arrived_pickup": "đã đến điểm đón, đang chờ đón khách",
    "picked_up": "đã đón khách, đang trên đường đến điểm trả",
    "completed": "đã hoàn thành",
}
_STATUS_PHRASES_EN = {
    "pending": "just created, waiting to be assigned",
    "notified": "not yet confirmed, awaiting your response",
    "calling": "not yet confirmed, awaiting your response",
    "confirmed": "confirmed, on the way to pickup",
    "arrived_pickup": "arrived at pickup, waiting for the customer",
    "picked_up": "customer picked up, on the way to dropoff",
    "completed": "completed",
}


def status_phrase(status: str, lang: str = "vi") -> str:
    phrases = _STATUS_PHRASES_EN if lang == "en" else _STATUS_PHRASES_VI
    return phrases.get(status, status)


def _needs_schedule_confirm(trip: dict) -> bool:
    """A trip is an unconfirmed scheduled pickup if it has a pickup_time and isn't accepted yet."""
    return bool(trip.get("pickup_time")) and trip.get("status") in _UNCONFIRMED_STATUSES


def _schedule_confirm_prompt(index: int, time: str, lang: str) -> str:
    if lang == "en":
        return (
            f" Trip {index} is a scheduled pickup at {time} awaiting your confirmation."
            " Would you like to confirm it?"
        )
    return (
        f" Chuyến {index} là chuyến hẹn giờ lúc {time}, đang chờ anh/chị xác nhận."
        " Anh/chị có muốn xác nhận nhận chuyến này không?"
    )


def format_trip_detail(trip: dict, index: int, lang: str = "vi") -> str:
    pickup = short_address(trip.get("pickup_address", ""))
    dropoff = short_address(trip.get("dropoff_address", ""))
    money = fmt_money(estimated_fare(trip), lang)
    eta = trip.get("eta_minutes")
    km = trip.get("distance_km")
    time = trip.get("pickup_time", "")
    customer = trip.get("customer_name", "khách" if lang == "vi" else "customer")
    status = trip.get("status", "")

    if lang == "en":
        msg = (
            f"Trip {index}: pick up {customer} at {pickup}, drop off at {dropoff}. "
            f"Estimated fare: {money}."
        )
        if time:
            msg += f" Pickup time: {time}."
        if km:
            msg += f" Distance: {km} km."
        if eta:
            msg += f" ETA: {eta} min."
        if status:
            msg += f" Status: {status_phrase(status, lang)}."
        traffic = trip.get("traffic_note")
        if traffic:
            msg += f" Traffic: {traffic}."
        if _needs_schedule_confirm(trip):
            msg += _schedule_confirm_prompt(index, time, lang)
        return msg

    msg = (
        f"Chuyến {index}: đón {customer} tại {pickup}, đến {dropoff}. "
        f"Giá ước tính: {money}."
    )
    if time:
        msg += f" Giờ đón: {time}."
    if km:
        msg += f" Quãng đường: {km} km."
    if eta:
        msg += f" Dự kiến {eta} phút."
    if status:
        msg += f" Trạng thái: {status_phrase(status, lang)}."
    traffic = trip.get("traffic_note")
    if traffic:
        msg += f" {traffic}."
    if _needs_schedule_confirm(trip):
        msg += _schedule_confirm_prompt(index, time, lang)
    return msg


def format_trip_brief(trip: dict, index: int, lang: str = "vi") -> str:
    pickup = short_address(trip.get("pickup_address", ""), 36)
    dropoff = short_address(trip.get("dropoff_address", ""), 36)
    fare = fmt_money(estimated_fare(trip), lang)
    time = trip.get("pickup_time", "")
    customer = trip.get("customer_name", "khách" if lang == "vi" else "customer")
    # Plain words instead of "—"/"→" — this string is spoken aloud by TTS, and
    # ElevenLabs (eleven_flash_v2_5) noticeably destabilizes pacing/tone when
    # it hits non-standard punctuation glyphs in a dense, list-like sentence.
    # Each field is explicitly labeled (customer/pickup/dropoff/fare) rather
    # than a bare comma list — the driver needs to hear WHO/WHERE/HOW MUCH
    # unambiguously for each trip in a multi-trip list, not guess from order.
    if lang == "en":
        msg = f"{index}. Customer {customer}, pickup {pickup}, dropoff {dropoff}, fare {fare}"
        if time:
            msg += f", pickup time {time}"
        return msg

    msg = f"{index}. Khách hàng {customer}, điểm đón {pickup}, điểm trả {dropoff}, giá {fare}"
    if time:
        msg += f", giờ đón {time}"
    return msg


def format_trip_list(trips: list[dict], lang: str = "vi") -> str:
    shown = trips[:MAX_LIST]
    if not shown:
        return ""

    if len(shown) == 1:
        return format_trip_detail(shown[0], 1, lang)

    if lang == "en":
        header = f"You have {len(trips)} upcoming trip(s)"
        if len(trips) > MAX_LIST:
            header += f" (showing first {MAX_LIST})"
        suffix = " Say the trip number for more details."
    else:
        header = f"Anh/chị có {len(trips)} chuyến sắp tới"
        if len(trips) > MAX_LIST:
            header += f" (hiển thị {MAX_LIST} chuyến gần nhất)"
        suffix = " Anh/chị muốn biết chi tiết chuyến nào thì nói số thứ tự."

    lines = [format_trip_brief(t, i, lang) for i, t in enumerate(shown, 1)]
    msg = header + ": " + "; ".join(lines) + "." + suffix

    scheduled = [
        (i, t) for i, t in enumerate(shown, 1) if _needs_schedule_confirm(t)
    ]
    if scheduled:
        if lang == "en":
            idxs = ", ".join(str(i) for i, _ in scheduled)
            noun = "Trip" if len(scheduled) == 1 else "Trips"
            msg += (
                f" {noun} {idxs} {'is' if len(scheduled) == 1 else 'are'} scheduled"
                " pickup(s) awaiting your confirmation — let me know which one to confirm."
            )
        else:
            idxs = ", ".join(str(i) for i, _ in scheduled)
            noun = "Chuyến" if len(scheduled) == 1 else "Các chuyến"
            msg += (
                f" {noun} {idxs} là chuyến hẹn giờ đang chờ xác nhận."
                " Anh/chị cho biết muốn xác nhận chuyến nào."
            )
    return msg
