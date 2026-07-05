"""
PrefetchProcessor — loads full driver/customer context in ONE API call at session start.

Tools read from context_store (no await). Mutations update context immediately.
"""
import logging

from livekit.agents import AgentSession
from app.services import backend_api
from app.voicebot.processors import context_store

logger = logging.getLogger("voice-agent.processors.prefetch")


async def run_driver(session: AgentSession, driver_phone: str) -> None:
    if not driver_phone:
        return
    try:
        payload = await backend_api.get_driver_context(driver_phone)
        context_store.load_driver_context(session.userdata, payload)
        logger.info(
            "driver prefetch complete | phone=%s upcoming=%s current=%s",
            driver_phone,
            len(context_store.get_upcoming_trips(session.userdata)),
            bool(context_store.get_current_trip(session.userdata)),
        )
    except Exception:
        logger.error("driver prefetch failed", exc_info=True)
        context_store.init_context(session.userdata)


async def run_customer(session: AgentSession, customer_phone: str) -> None:
    if not customer_phone:
        return
    try:
        payload = await backend_api.get_customer_context(customer_phone)
        context_store.load_customer_context(session.userdata, payload)
        logger.info(
            "customer prefetch complete | phone=%s active=%s",
            customer_phone,
            bool(context_store.get_active_customer_trip(session.userdata)),
        )
    except Exception:
        logger.error("customer prefetch failed", exc_info=True)
        try:
            trips = await backend_api.get_customer_trips(customer_phone)
            context_store.load_customer_trips(session.userdata, trips)
        except Exception:
            context_store.init_context(session.userdata)


# Backward-compatible alias
async def run(session: AgentSession, driver_phone: str) -> None:
    await run_driver(session, driver_phone)
