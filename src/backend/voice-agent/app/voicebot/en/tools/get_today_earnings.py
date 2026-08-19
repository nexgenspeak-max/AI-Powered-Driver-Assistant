from livekit.agents import RunContext, function_tool
from app.voicebot.en.tools_definition import raw_schema
from app.voicebot.processors import context_store


def _format_earnings_reply(userdata: dict) -> str:
    data = context_store.get(userdata, "today_earnings", {})
    if not data:
        return "No earnings data available for today yet."

    total = data.get("total_earnings", 0)
    trips = data.get("trip_count", 0)
    bonus = data.get("bonus_earnings", 0)
    hours = data.get("hours_online", 0)

    msg = f"Today you've completed {trips} trip(s) with earnings of {total:,.0f}."
    if bonus:
        msg += f" Including {bonus:,.0f} in bonuses."
    if hours:
        msg += f" Online for {hours:.1f} hour(s)."
    return msg


@function_tool(raw_schema=raw_schema["get_today_earnings"])
async def get_today_earnings(raw_arguments: dict, context: RunContext) -> str:
    # Cache-first — see refresh_latest_data.py for the live re-fetch, only
    # triggered when the driver actually confirms they want it.
    msg = _format_earnings_reply(context.userdata)
    age_note = context_store.format_age_note(context.userdata, lang="en")
    context_store.set_pending_refresh(context.userdata, "today_earnings")
    return f"{msg} (as of {age_note}). Would you like me to get the latest data? It'll take a moment."
