"""SilenceTracker — driver check-in is spoken once, then session ends."""
import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.silence_tracker import SilenceTracker


def test_spoken_check_in_once_then_goodbye(monkeypatch):
    async def _run() -> None:
        session = MagicMock()
        session.say = AsyncMock()
        session.run = AsyncMock()
        ctx = MagicMock()

        tracker = SilenceTracker(
            session=session,
            ctx=ctx,
            silence_threshold_seconds=0.05,
            max_consecutive_silences=2,
            check_in_spoken_message="Bạn còn đó không?",
            goodbye_message="Tạm biệt.",
        )

        end_called = asyncio.Event()

        async def fake_end_room_session(_ctx, reason=""):
            end_called.set()

        monkeypatch.setattr(
            "app.services.silence_tracker.end_room_session",
            fake_end_room_session,
        )

        await tracker.start()
        await asyncio.sleep(0.08)
        assert session.say.await_count == 1
        session.say.assert_awaited_with("Bạn còn đó không?", allow_interruptions=True)
        session.run.assert_not_awaited()

        await asyncio.sleep(0.08)
        assert session.say.await_count == 2
        assert session.say.await_args_list[1] == (
            ("Tạm biệt.",),
            {"allow_interruptions": False},
        )
        assert end_called.is_set()

    asyncio.run(_run())


def test_no_end_session_stops_check_ins_after_max(monkeypatch):
    async def _run() -> None:
        session = MagicMock()
        session.say = AsyncMock()
        ctx = MagicMock()
        tracker = SilenceTracker(
            session=session,
            ctx=ctx,
            silence_threshold_seconds=0.05,
            max_consecutive_silences=2,
            end_session_on_timeout=False,
            check_in_spoken_message="Bạn còn đó không?",
        )
        monkeypatch.setattr(
            "app.services.silence_tracker.end_room_session",
            AsyncMock(),
        )
        await tracker.start()
        await asyncio.sleep(0.08)
        await asyncio.sleep(0.08)
        assert session.say.await_count == 1
        assert not tracker.is_active

    asyncio.run(_run())
