from livekit.agents import RunContext, function_tool
from app.voicebot.vn.tools_definition import raw_schema
from app.voicebot.processors import context_store


def _format_earnings_reply(userdata: dict) -> str:
    data = context_store.get(userdata, "today_earnings", {})
    if not data:
        return "Chưa có dữ liệu thu nhập hôm nay."

    total = data.get("total_earnings", 0)
    trips = data.get("trip_count", 0)
    bonus = data.get("bonus_earnings", 0)
    hours = data.get("hours_online", 0)

    msg = f"Hôm nay anh/chị đã hoàn thành {trips} chuyến, thu nhập {total:,.0f}đ."
    if bonus:
        msg += f" Trong đó thưởng {bonus:,.0f}đ."
    if hours:
        msg += f" Thời gian online: {hours:.1f} giờ."
    return msg


@function_tool(raw_schema=raw_schema["get_today_earnings"])
async def get_today_earnings(raw_arguments: dict, context: RunContext) -> str:
    # Trả lời từ cache trước — live re-fetch chỉ diễn ra trong
    # refresh_latest_data.py, khi tài xế thật sự xác nhận muốn dữ liệu mới.
    msg = _format_earnings_reply(context.userdata)
    age_note = context_store.format_age_note(context.userdata, lang="vi")
    context_store.set_pending_refresh(context.userdata, "today_earnings")
    return f"{msg} (dữ liệu lúc {age_note}). Anh/chị có muốn em lấy dữ liệu mới nhất không ạ? Việc này sẽ mất một chút thời gian."
