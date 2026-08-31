import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.locales.en.constants import (
    ERR_NO_PENDING_REFRESH,
    ERR_NO_CURRENT_TRIP,
    ERR_NO_LOCATION,
    ERR_NO_CUSTOMER_TRIP,
    ERR_ETA_UNCONFIRMED,
)
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.locales.en.tools.get_today_earnings import _format_earnings_reply
from app.voicebot.processors.schedule_reply import format_schedule_reply
from app.voicebot.locales.en.tools.get_current_trip_info import _format_current_trip_reply
from app.voicebot.locales.en.tools.get_trip_traffic import _format_traffic_reply
from app.voicebot.locales.en.tools.get_bonus_info import _format_bonus_reply
from app.voicebot.processors.tool_reply import R
from app.voicebot.processors.tool_response_builders import (
    build_customer_eta_response,
    build_location_response,
    build_my_trip_response,
    build_next_stop_response,
    build_route_response,
    build_stats_response,
)
from app.voicebot.processors.next_stop import build_next_stop_suggestion

logger = logging.getLogger("voice-agent.en.tools.refresh_latest_data")


async def _reload_driver_context(userdata: dict, driver_phone: str) -> None:
    payload = await backend_api.get_driver_context(driver_phone)
    context_store.load_driver_context(userdata, payload)


@function_tool(raw_schema=raw_schema["refresh_latest_data"])
async def refresh_latest_data(raw_arguments: dict, context: RunContext) -> str:
    topic, args = context_store.pop_pending_refresh(context.userdata)
    if not topic:
        return await context_store.speak_and_stop(
            context.session,
            R("refresh_latest_data", ERR_NO_PENDING_REFRESH, lang="en"),
        )

    driver_phone = context.userdata.get("driver_phone", "")

    if topic == "today_earnings":
        try:
            fresh = await backend_api.get_today_earnings(driver_phone)
            context_store.set_context(context.userdata, "today_earnings", fresh)
        except Exception:
            logger.warning("refresh_latest_data(today_earnings) failed, using cached data", exc_info=True)
        return await context_store.speak_and_stop(
            context.session, _format_earnings_reply(context.userdata)
        )

    if topic == "upcoming_trips":
        try:
            fresh = await backend_api.get_upcoming_trips(driver_phone)
            context_store.set_upcoming_trips(context.userdata, fresh)
        except Exception:
            logger.warning("refresh_latest_data(upcoming_trips) failed, using cached data", exc_info=True)
        return await context_store.speak_and_stop(
            context.session,
            format_schedule_reply(context.userdata, args, lang="en"),
        )

    if topic in (
        "current_trip",
        "trip_traffic",
        "customer_location",
        "next_stop",
        "optimal_route",
    ):
        try:
            await _reload_driver_context(context.userdata, driver_phone)
        except Exception:
            logger.warning("refresh_latest_data(%s) failed, using cached data", topic, exc_info=True)
        if topic == "current_trip":
            reply = _format_current_trip_reply(context.userdata)
        elif topic == "trip_traffic":
            reply = _format_traffic_reply(context.userdata, args)
        elif topic == "next_stop":
            spoken = build_next_stop_suggestion(context.userdata, lang="en")
            reply = build_next_stop_response(spoken, lang="en")
        elif topic == "optimal_route":
            route = context_store.get_optimized_route(context.userdata)
            reply = build_route_response(route, lang="en")
        else:
            current = context_store.get_current_trip(context.userdata)
            if not current:
                reply = build_location_response("", lang="en", error=ERR_NO_CURRENT_TRIP)
            else:
                address = current.get("pickup_address", "")
                reply = (
                    build_location_response(address, lang="en")
                    if address
                    else build_location_response("", lang="en", error=ERR_NO_LOCATION)
                )
        return await context_store.speak_and_stop(context.session, reply)

    if topic in ("my_trip", "driver_eta"):
        customer_phone = context.userdata.get("customer_phone", "")
        try:
            payload = await backend_api.get_customer_context(customer_phone)
            context_store.load_customer_context(context.userdata, payload)
        except Exception:
            logger.warning("refresh_latest_data(%s) failed, using cached data", topic, exc_info=True)
        if topic == "my_trip":
            trip = context_store.get_active_customer_trip(context.userdata)
            reply = (
                build_my_trip_response(trip, lang="en")
                if trip
                else build_my_trip_response(None, lang="en", error=ERR_NO_CUSTOMER_TRIP)
            )
        else:
            trip = context_store.get_active_customer_trip(context.userdata)
            if not trip or trip.get("status") != "confirmed":
                reply = build_customer_eta_response(None, lang="en", error=ERR_ETA_UNCONFIRMED)
            else:
                reply = build_customer_eta_response(trip, lang="en")
        return await context_store.speak_and_stop(context.session, reply)

    if topic == "active_bonuses":
        try:
            fresh = await backend_api.get_active_bonuses(driver_phone)
            context_store.set_context(context.userdata, "active_bonuses", fresh)
        except Exception:
            logger.warning("refresh_latest_data(active_bonuses) failed, using cached data", exc_info=True)
        return await context_store.speak_and_stop(
            context.session, _format_bonus_reply(context.userdata)
        )

    if topic == "driver_profile":
        try:
            fresh = await backend_api.get_driver_profile(driver_phone)
            context_store.set_context(context.userdata, "driver_profile", fresh)
        except Exception:
            logger.warning("refresh_latest_data(driver_profile) failed, using cached data", exc_info=True)
        data = context_store.get(context.userdata, "driver_profile", {})
        return await context_store.speak_and_stop(
            context.session, build_stats_response(data, lang="en")
        )

    return await context_store.speak_and_stop(
        context.session,
        R("refresh_latest_data", ERR_NO_PENDING_REFRESH, lang="en"),
    )
