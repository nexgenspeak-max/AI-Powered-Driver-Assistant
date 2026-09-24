"""
PrefetchProcessor — loads full driver/customer context in ONE API call at session start.

Tools read from context_store (no await). Mutations update context immediately.
"""
import logging
import time

from livekit.agents import AgentSession

from app.devlog import event as dev_event
from app.services import backend_api
from app.voicebot.processors import context_store

logger = logging.getLogger("llm-orchestrator.processors.prefetch")


def prefetch_role(mode: str) -> str | None:
    """Which context HTTP to run at session start, or None to skip.

    Isolated customer outbound (`custcall`) already has trip/message in room
    metadata and CustomerCallAgent only exposes end_customer_call.
    """
    if mode == "custcall":
        return None
    if mode == "customer":
        return "customer"
    return "driver"


async def run_driver(session: AgentSession, driver_phone: str) -> None:
    if not driver_phone:
        return
    started_at = time.perf_counter()
    try:
        payload = await backend_api.get_driver_context(driver_phone)
        context_store.load_driver_context(session.userdata, payload)
        upcoming = len(context_store.get_upcoming_trips(session.userdata))
        has_current = bool(context_store.get_current_trip(session.userdata))
        logger.info(
            "driver prefetch complete | phone=%s upcoming=%s current=%s",
            driver_phone,
            upcoming,
            has_current,
        )
        # `event(kind, **fields)` — never pass kind= here or the session
        # crashes after a successful load (live TypeError on Trợ lý connect).
        dev_event(
            "prefetch",
            mode="driver",
            upcoming=upcoming,
            has_current=has_current,
            duration_ms=(time.perf_counter() - started_at) * 1000,
        )
    except Exception as exc:
        logger.error("driver prefetch failed", exc_info=True)
        dev_event(
            "prefetch",
            ok=False,
            mode="driver",
            duration_ms=(time.perf_counter() - started_at) * 1000,
            error=type(exc).__name__,
            detail=str(exc),
        )
        context_store.init_context(session.userdata)


async def run_customer(session: AgentSession, customer_phone: str) -> None:
    if not customer_phone:
        return
    started_at = time.perf_counter()
    try:
        payload = await backend_api.get_customer_context(customer_phone)
        context_store.load_customer_context(session.userdata, payload)
        has_active = bool(context_store.get_active_customer_trip(session.userdata))
        logger.info(
            "customer prefetch complete | phone=%s active=%s",
            customer_phone,
            has_active,
        )
        dev_event(
            "prefetch",
            mode="customer",
            has_active=has_active,
            duration_ms=(time.perf_counter() - started_at) * 1000,
        )
    except Exception as exc:
        logger.error("customer prefetch failed", exc_info=True)
        dev_event(
            "prefetch",
            ok=False,
            mode="customer",
            duration_ms=(time.perf_counter() - started_at) * 1000,
            error=type(exc).__name__,
            detail=str(exc),
        )
        try:
            trips = await backend_api.get_customer_trips(customer_phone)
            context_store.load_customer_trips(session.userdata, trips)
        except Exception:
            context_store.init_context(session.userdata)


# Backward-compatible alias
async def run(session: AgentSession, driver_phone: str) -> None:
    await run_driver(session, driver_phone)
