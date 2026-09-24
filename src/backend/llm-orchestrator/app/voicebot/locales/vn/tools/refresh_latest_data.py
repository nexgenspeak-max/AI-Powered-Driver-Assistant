import logging
from livekit.agents import RunContext, function_tool
from app.voicebot.locales.vn.tools_definition import raw_schema
from app.voicebot.locales.vn.constants import (
    ERR_ETA_UNCONFIRMED,
    ERR_NO_CURRENT_TRIP,
    ERR_NO_CUSTOMER_TRIP,
    ERR_NO_LOCATION,
    ERR_NO_PENDING_REFRESH,
)
from app.services import backend_api
from app.voicebot.processors import context_store
from app.voicebot.locales.vn.tools.get_today_earnings import _format_earnings_reply
from app.voicebot.processors.schedule_reply import format_schedule_reply
from app.voicebot.locales.vn.tools.get_current_trip_info import _format_current_trip_reply
from app.voicebot.locales.vn.tools.get_trip_traffic import _format_traffic_reply
from app.voicebot.locales.vn.tools.get_bonus_info import _format_bonus_reply
from app.voicebot.processors.next_stop import build_next_stop_suggestion
from app.voicebot.processors.tool_response_builders import (
    build_customer_eta_response,
    build_location_response,
    build_my_trip_response,
    build_route_response,
    build_stats_response,
)
from app.voicebot.processors.tool_reply import R

logger = logging.getLogger("llm-orchestrator.vn.tools.refresh_latest_data")


async def _reload_driver_context(userdata: dict, driver_phone: str) -> None:
    payload = await backend_api.get_driver_context(driver_phone)
    context_store.load_driver_context(userdata, payload)


@function_tool(raw_schema=raw_schema["refresh_latest_data"])
async def refresh_latest_data(raw_arguments: dict, context: RunContext) -> str:
    topic, args = context_store.pop_pending_refresh(context.userdata)
    if not topic:
        return await context_store.speak_and_stop(
            context.session,
                R("refresh_latest_data", ERR_NO_PENDING_REFRESH, lang="vi", action=["refresh_latest_data()"]),
        )

    driver_phone = context.userdata.get("driver_phone", "")

    if topic == "today_earnings":
        try:
            fresh = await backend_api.get_today_earnings(driver_phone)
            context_store.set_context(context.userdata, "today_earnings", fresh)
        except Exception:
            logger.warning("refresh_latest_data(today_earnings) failed, using cached data", exc_info=True)
        return await context_store.speak_and_stop(context.session, _format_earnings_reply(context.userdata)
        )

    if topic == "upcoming_trips":
        try:
            fresh = await backend_api.get_upcoming_trips(driver_phone)
            context_store.set_upcoming_trips(context.userdata, fresh)
        except Exception:
            logger.warning("refresh_latest_data(upcoming_trips) failed, using cached data", exc_info=True)
        return await context_store.speak_and_stop(
            context.session,
                format_schedule_reply(context.userdata, args, lang="vi"),
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
            text = _format_current_trip_reply(context.userdata)
        elif topic == "trip_traffic":
            text = _format_traffic_reply(context.userdata, args)
        elif topic == "next_stop":
            text = build_next_stop_suggestion(context.userdata, lang="vi")
        elif topic == "optimal_route":
            text = build_route_response(
                context_store.get_optimized_route(context.userdata), lang="vi"
            )
        else:
            current = context_store.get_current_trip(context.userdata)
            if not current:
                text = build_location_response("", lang="vi", error=ERR_NO_CURRENT_TRIP)
            else:
                address = current.get("pickup_address", "")
                text = (
                    build_location_response(address, lang="vi")
                    if address
                    else build_location_response("", lang="vi", error=ERR_NO_LOCATION)
                )
        return await context_store.speak_and_stop(context.session, text)

    if topic in ("my_trip", "driver_eta"):
        customer_phone = context.userdata.get("customer_phone", "")
        try:
            payload = await backend_api.get_customer_context(customer_phone)
            context_store.load_customer_context(context.userdata, payload)
        except Exception:
            logger.warning("refresh_latest_data(%s) failed, using cached data", topic, exc_info=True)
        if topic == "my_trip":
            trip = context_store.get_active_customer_trip(context.userdata)
            text = (
                build_my_trip_response(trip, lang="vi")
                if trip
                else build_my_trip_response(None, lang="vi", error=ERR_NO_CUSTOMER_TRIP)
            )
        else:
            trip = context_store.get_active_customer_trip(context.userdata)
            if not trip or trip.get("status") != "confirmed":
                text = build_customer_eta_response(None, lang="vi", error=ERR_ETA_UNCONFIRMED)
            else:
                text = build_customer_eta_response(trip, lang="vi")
        return await context_store.speak_and_stop(context.session, text)

    if topic == "active_bonuses":
        try:
            fresh = await backend_api.get_active_bonuses(driver_phone)
            context_store.set_context(context.userdata, "active_bonuses", fresh)
        except Exception:
            logger.warning("refresh_latest_data(active_bonuses) failed, using cached data", exc_info=True)
        return await context_store.speak_and_stop(context.session, _format_bonus_reply(context.userdata)
        )

    if topic == "driver_profile":
        try:
            fresh = await backend_api.get_driver_profile(driver_phone)
            context_store.set_context(context.userdata, "driver_profile", fresh)
        except Exception:
            logger.warning("refresh_latest_data(driver_profile) failed, using cached data", exc_info=True)
        return await context_store.speak_and_stop(
            context.session,
                build_stats_response(
                context_store.get(context.userdata, "driver_profile", {}), lang="vi"
            ),
        )

    return await context_store.speak_and_stop(
        context.session,
        R("refresh_latest_data", ERR_NO_PENDING_REFRESH, lang="vi", action=["refresh_latest_data()"]),
    )
