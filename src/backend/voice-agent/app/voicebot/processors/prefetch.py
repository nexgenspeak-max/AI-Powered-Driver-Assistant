"""
PrefetchProcessor — runs at session start to pre-load driver context data.

Fetches all driver data in parallel so tools can respond instantly without
waiting for API calls at the moment the driver asks.

Data is stored in session.userdata["prefetch"] and refreshed on demand
by calling run() again.  Tools should call get() to read it.
"""
import asyncio
import logging
import time

from livekit.agents import AgentSession
from app.services import backend_api

logger = logging.getLogger("voice-agent.processors.prefetch")

_STALE_SECONDS = 120  # refresh prefetch if older than 2 minutes


async def run(session: AgentSession, driver_phone: str) -> None:
    """
    Fetch driver data in parallel and store in session.userdata["prefetch"].
    Safe to call multiple times — silently overwrites the previous snapshot.
    """
    if not driver_phone:
        return
    try:
        profile, earnings, bonuses, upcoming = await asyncio.gather(
            backend_api.get_driver_profile(driver_phone),
            backend_api.get_today_earnings(driver_phone),
            backend_api.get_active_bonuses(driver_phone),
            backend_api.get_upcoming_trips(driver_phone),
            return_exceptions=True,
        )
        session.userdata["prefetch"] = {
            "driver_profile": profile  if not isinstance(profile,  Exception) else {},
            "today_earnings": earnings if not isinstance(earnings, Exception) else {},
            "active_bonuses": bonuses  if not isinstance(bonuses,  Exception) else [],
            "upcoming_trips": upcoming if not isinstance(upcoming, Exception) else [],
            "fetched_at":     time.monotonic(),
        }
        logger.info("prefetch complete | driver=%s", driver_phone)
    except Exception:
        logger.error("prefetch failed", exc_info=True)
        session.userdata.setdefault("prefetch", {"fetched_at": time.monotonic()})


def get(session_userdata: dict, key: str, default=None):
    """
    Read a prefetched value.
    Returns default if the prefetch is missing or stale.
    """
    prefetch = session_userdata.get("prefetch", {})
    age = time.monotonic() - prefetch.get("fetched_at", 0)
    if age > _STALE_SECONDS:
        return default
    return prefetch.get(key, default)
