"""Prefetch must not crash the session after a successful context load.

Live failure: driver prefetch completed (upcoming=1, current=False) then
dev_event(..., kind='driver') collided with event(kind, ...) and the
session died before confirm_trip could run.
"""
from unittest.mock import AsyncMock, MagicMock, patch

from app.voicebot.processors import context_store
from app.voicebot.processors.prefetch import run_customer, run_driver


async def test_run_driver_keeps_context_after_successful_prefetch():
    session = MagicMock()
    session.userdata = {}
    payload = {
        "current_trip": None,
        "upcoming_trips": [
            {
                "trip_id": "2d186e9d-6ba1-41be-a86d-e898b0fb1b37",
                "status": "notified",
                "customer_name": "Trương Bá Chính",
            }
        ],
        "active_trip": None,
    }

    with patch(
        "app.voicebot.processors.prefetch.backend_api.get_driver_context",
        new_callable=AsyncMock,
        return_value=payload,
    ):
        await run_driver(session, "0900111222")

    upcoming = context_store.get_upcoming_trips(session.userdata)
    assert len(upcoming) == 1
    assert upcoming[0]["trip_id"] == "2d186e9d-6ba1-41be-a86d-e898b0fb1b37"
    assert context_store.get_current_trip(session.userdata) is None


async def test_run_customer_keeps_context_after_successful_prefetch():
    session = MagicMock()
    session.userdata = {}
    payload = {
        "active_trip": {"trip_id": "c1", "status": "confirmed"},
        "trips": [{"trip_id": "c1", "status": "confirmed"}],
    }

    with patch(
        "app.voicebot.processors.prefetch.backend_api.get_customer_context",
        new_callable=AsyncMock,
        return_value=payload,
    ):
        await run_customer(session, "0901222333")

    assert context_store.get_active_customer_trip(session.userdata) is not None
