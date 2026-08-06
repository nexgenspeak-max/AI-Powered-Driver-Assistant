import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.vn.constants import ERR_NO_UPCOMING
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.processors.trip_format import format_trip_detail, format_trip_list

logger = logging.getLogger("voice-agent.vn.tools.check_upcoming_trips")

# "Đang chạy" = tài xế đã nhận và đang thực hiện; "sắp tới" = chuyến mới, chưa xác nhận —
# đúng theo status thật (mirrors trip-service's DRIVER_ACTIVE_STATUSES split). Không dùng
# 'pending' cho "đang chạy" — trip-service's current_trip picker (ACTIVE set) cũng không
# coi 'pending' là active, chỉ tính từ lúc có driver được thông báo trở đi.
IN_PROGRESS_STATUSES = ("confirmed", "arrived_pickup", "picked_up")
UPCOMING_STATUSES = ("pending", "notified", "calling")

_SCOPE_LABELS_VI = {
    "in_progress": "đang chạy",
    "upcoming": "sắp tới",
}


@function_tool(raw_schema=raw_schema["check_upcoming_trips"])
async def check_upcoming_trips(raw_arguments: dict, context: RunContext) -> str:
    # context_store's prefetched data is a one-time snapshot taken at
    # session start — a trip a customer books mid-session never appears in
    # it (confirmed live: driver had 2 trips, this tool only reported 1
    # because the 2nd was booked after prefetch). This is the driver
    # explicitly asking to check, so re-fetch live instead of trusting the
    # cache; update the cache too so a follow-up trip_index lookup in the
    # same/next turn stays consistent with what was just read out. Falls
    # back to the cached snapshot if the live call fails, same as before.
    driver_phone = context.userdata.get("driver_phone", "")
    if driver_phone:
        try:
            fresh = await backend_api.get_upcoming_trips(driver_phone)
            context_store.set_upcoming_trips(context.userdata, fresh)
        except Exception:
            logger.warning("check_upcoming_trips — live refresh failed, using cached data", exc_info=True)

    trips = context_store.get_schedule_trips(context.userdata)
    if not trips:
        return ERR_NO_UPCOMING

    scope = raw_arguments.get("scope") or "all"
    if scope == "in_progress":
        trips = [t for t in trips if t.get("status") in IN_PROGRESS_STATUSES]
    elif scope == "upcoming":
        trips = [t for t in trips if t.get("status") in UPCOMING_STATUSES]
    if not trips:
        label = _SCOPE_LABELS_VI.get(scope)
        return f"Anh/chị không có chuyến nào {label}." if label else ERR_NO_UPCOMING

    trip_index = raw_arguments.get("trip_index")
    if trip_index is not None:
        idx = int(trip_index)
        if idx < 1 or idx > len(trips):
            return f"Anh/chị chỉ có {len(trips)} chuyến. Vui lòng chọn từ 1 đến {len(trips)}."
        return format_trip_detail(trips[idx - 1], idx, lang="vi")

    return format_trip_list(trips, lang="vi")
