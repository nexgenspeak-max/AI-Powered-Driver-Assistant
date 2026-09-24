"""Turn filler timing — speak once if reply audio would miss the ~2s bar."""
import time
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import asyncio

import pytest

from app.voicebot.processors.turn_filler import (
    FILLER_DELAY_S,
    FILLER_EN,
    FILLER_VN,
    filler_phrase,
    filler_wait_s,
    mark_reply_started,
    schedule_turn_filler,
    should_speak_turn_filler,
)


def test_filler_phrases_vn_en_are_generic_holds():
    assert filler_phrase("vn") == FILLER_VN
    assert filler_phrase("en") == FILLER_EN
    assert "chuyến" not in FILLER_VN.lower()
    assert "trip" not in FILLER_EN.lower()
    assert "đợi" in FILLER_VN.lower() or "chút" in FILLER_VN.lower()
    assert "moment" in FILLER_EN.lower()


def test_filler_delay_is_about_two_seconds():
    assert 1.5 <= FILLER_DELAY_S <= 2.5


def test_filler_wait_shrinks_when_driver_already_stopped():
    assert filler_wait_s(delay_s=2.0, user_stopped_at=10.0, now=10.8) == pytest.approx(1.2)
    assert filler_wait_s(delay_s=2.0, user_stopped_at=10.0, now=12.5) == 0.0


def test_filler_wait_full_delay_when_stamp_missing_or_stale():
    assert filler_wait_s(delay_s=2.0, user_stopped_at=None, now=10.0) == 2.0
    assert filler_wait_s(delay_s=2.0, user_stopped_at=10.0, now=50.0) == 2.0


def test_should_speak_before_delay_is_false():
    assert (
        should_speak_turn_filler(
            elapsed_s=1.0,
            reply_started=False,
            already_spoken=False,
            delay_s=FILLER_DELAY_S,
        )
        is False
    )


def test_should_speak_at_delay_when_quiet():
    assert (
        should_speak_turn_filler(
            elapsed_s=FILLER_DELAY_S,
            reply_started=False,
            already_spoken=False,
        )
        is True
    )


def test_should_skip_if_reply_started_or_already_spoken():
    assert (
        should_speak_turn_filler(
            elapsed_s=2.0,
            reply_started=True,
            already_spoken=False,
        )
        is False
    )
    assert (
        should_speak_turn_filler(
            elapsed_s=2.0,
            reply_started=False,
            already_spoken=True,
        )
        is False
    )


@pytest.mark.asyncio
async def test_schedule_skips_when_reply_started_before_delay():
    session = SimpleNamespace(userdata={}, say=MagicMock(), agent_state="listening")

    with patch("app.voicebot.processors.turn_filler.event") as mock_event:
        schedule_turn_filler(session, lang="vn", delay_s=0.05)
        # Cancel before the filler delay elapses.
        await asyncio.sleep(0.01)
        mark_reply_started(session)
        await asyncio.sleep(0.08)

    session.say.assert_not_called()
    skip_calls = [
        c for c in mock_event.call_args_list if c.args and c.args[0] == "turn_filler_skip"
    ]
    assert skip_calls
    assert skip_calls[0].kwargs.get("reason") == "reply_started"
    assert "duration_ms" in skip_calls[0].kwargs
    assert skip_calls[0].kwargs.get("ok") is True


@pytest.mark.asyncio
async def test_schedule_speaks_filler_once_when_late():
    session = SimpleNamespace(
        userdata={},
        say=MagicMock(return_value=None),
        agent_state="thinking",
    )

    with patch("app.voicebot.processors.turn_filler.event") as mock_event:
        schedule_turn_filler(session, lang="en", delay_s=0.02)
        await asyncio.sleep(0.08)

    session.say.assert_called_once()
    assert session.say.call_args.args[0] == FILLER_EN
    fire_calls = [
        c for c in mock_event.call_args_list if c.args and c.args[0] == "turn_filler"
    ]
    assert fire_calls
    assert fire_calls[0].kwargs.get("ok") is True
    assert "duration_ms" in fire_calls[0].kwargs


@pytest.mark.asyncio
async def test_schedule_fires_on_remaining_time_not_a_fresh_two_seconds():
    """Driver already silent 0.15s of a 0.2s bar — filler must not wait the full bar."""
    session = SimpleNamespace(
        userdata={"_turn_wall_state": {"user_stopped_at": time.perf_counter() - 0.15}},
        say=MagicMock(return_value=None),
        agent_state="thinking",
    )
    with patch("app.voicebot.processors.turn_filler.event"):
        schedule_turn_filler(session, lang="vn", delay_s=0.2)
        await asyncio.sleep(0.08)
    session.say.assert_called_once()
    assert session.say.call_args.args[0] == FILLER_VN
