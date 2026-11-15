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


def _queued_handle() -> MagicMock:
    handle = MagicMock()
    handle.done.return_value = False
    return handle


@pytest.mark.asyncio
async def test_queued_filler_is_dropped_when_real_reply_plays_first():
    """Reply already queued when filler fires: say() lands behind it — drop the filler."""
    filler_handle = _queued_handle()
    session = SimpleNamespace(
        userdata={},
        say=MagicMock(return_value=filler_handle),
        agent_state="thinking",
        current_speech=None,
    )
    with patch("app.voicebot.processors.turn_filler.event") as mock_event:
        schedule_turn_filler(session, lang="vn", delay_s=0.01)
        await asyncio.sleep(0.05)
        session.current_speech = _queued_handle()
        mark_reply_started(session)

    filler_handle.interrupt.assert_called_once()
    drop_calls = [
        c for c in mock_event.call_args_list
        if c.args and c.args[0] == "turn_filler_skip" and c.kwargs.get("reason") == "reply_first"
    ]
    assert drop_calls


@pytest.mark.asyncio
async def test_filler_is_kept_when_it_is_the_speech_playing():
    filler_handle = _queued_handle()
    session = SimpleNamespace(
        userdata={},
        say=MagicMock(return_value=filler_handle),
        agent_state="thinking",
        current_speech=None,
    )
    with patch("app.voicebot.processors.turn_filler.event"):
        schedule_turn_filler(session, lang="vn", delay_s=0.01)
        await asyncio.sleep(0.05)
        session.current_speech = filler_handle
        mark_reply_started(session)

    filler_handle.interrupt.assert_not_called()


@pytest.mark.asyncio
async def test_filler_plays_presynthesized_audio_when_tts_is_available():
    """Synthesizing on demand lands after the 2s bar; cached frames play at once."""
    frames = [object(), object()]
    synthesized: list[str] = []

    def synthesize(text):
        async def _gen():
            synthesized.append(text)
            for frame in frames:
                yield SimpleNamespace(frame=frame)
        return _gen()

    said: list[dict] = []

    def say(text, **kwargs):
        said.append({"text": text, **kwargs})

    session = SimpleNamespace(
        userdata={}, agent_state="thinking", say=say, tts=SimpleNamespace(synthesize=synthesize)
    )
    schedule_turn_filler(session, lang="vn", delay_s=0.03)
    await asyncio.sleep(0.1)

    assert synthesized == [FILLER_VN]
    assert len(said) == 1 and said[0]["text"] == FILLER_VN
    played = [f async for f in said[0]["audio"]]
    assert played == frames

    # Second turn reuses the cached audio instead of synthesizing again.
    schedule_turn_filler(session, lang="vn", delay_s=0.03)
    await asyncio.sleep(0.1)
    assert synthesized == [FILLER_VN]
    assert len(said) == 2


@pytest.mark.asyncio
async def test_filler_falls_back_to_text_when_presynthesis_fails():
    def synthesize(text):
        async def _gen():
            raise RuntimeError("tts down")
            yield  # pragma: no cover
        return _gen()

    said: list[dict] = []

    def say(text, **kwargs):
        said.append({"text": text, **kwargs})

    session = SimpleNamespace(
        userdata={}, agent_state="thinking", say=say, tts=SimpleNamespace(synthesize=synthesize)
    )
    schedule_turn_filler(session, lang="vn", delay_s=0.03)
    await asyncio.sleep(0.1)

    assert len(said) == 1 and "audio" not in said[0]


def _stamped_session(seconds_ago: float = 0.0, agent_state: str = "thinking"):
    return SimpleNamespace(
        userdata={"_turn_wall_state": {"user_stopped_at": time.perf_counter() - seconds_ago}},
        agent_state=agent_state,
    )


async def _chunks(items, first_delay: float = 0.0):
    await asyncio.sleep(first_delay)
    for item in items:
        yield item


@pytest.mark.asyncio
async def test_inline_filler_opens_reply_when_llm_is_silent_at_deadline():
    from app.voicebot.processors.turn_filler import inline_turn_filler

    session = _stamped_session()
    out = [c async for c in inline_turn_filler(
        session, _chunks(["Bạn còn 3 chuyến."], first_delay=0.08), lang="vn", delay_s=0.02)]
    from livekit.agents import FlushSentinel

    assert out[0] == FILLER_VN + " "
    assert isinstance(out[1], FlushSentinel)  # TTS speaks the filler at once
    assert out[2:] == ["Bạn còn 3 chuyến."]


@pytest.mark.asyncio
async def test_inline_filler_stays_silent_when_llm_answers_in_time():
    from app.voicebot.processors.turn_filler import inline_turn_filler

    session = _stamped_session()
    out = [c async for c in inline_turn_filler(
        session, _chunks(["Bạn còn 3 chuyến."]), lang="vn", delay_s=0.5)]
    assert out == ["Bạn còn 3 chuyến."]


@pytest.mark.asyncio
async def test_inline_filler_opens_followup_llm_call_when_deadline_already_passed():
    """After a tool call with nothing spoken, the next LLM call is already late."""
    from app.voicebot.processors.turn_filler import inline_turn_filler

    session = _stamped_session(seconds_ago=3.0)
    out = [c async for c in inline_turn_filler(
        session, _chunks(["Xong."], first_delay=0.03), lang="en", delay_s=1.5)]
    assert out[0] == FILLER_EN + " " and out[-1] == "Xong." and len(out) == 3


@pytest.mark.asyncio
async def test_inline_filler_passes_through_without_stamp_or_when_agent_speaks():
    from app.voicebot.processors.turn_filler import inline_turn_filler

    no_stamp = SimpleNamespace(userdata={"_turn_wall_state": {"user_stopped_at": None}},
                               agent_state="thinking")
    out = [c async for c in inline_turn_filler(
        no_stamp, _chunks(["A"], first_delay=0.05), lang="vn", delay_s=0.01)]
    assert out == ["A"]

    speaking = _stamped_session(agent_state="speaking")
    out = [c async for c in inline_turn_filler(
        speaking, _chunks(["A"], first_delay=0.05), lang="vn", delay_s=0.01)]
    assert out == ["A"]


@pytest.mark.asyncio
async def test_inline_filler_not_added_after_a_tool_call_chunk():
    from app.voicebot.processors.turn_filler import inline_turn_filler

    tool_chunk = SimpleNamespace(delta=SimpleNamespace(content=None, tool_calls=[object()]))

    async def stream():
        yield tool_chunk
        await asyncio.sleep(0.06)
        yield "sau công cụ"

    session = _stamped_session()
    out = [c async for c in inline_turn_filler(session, stream(), lang="vn", delay_s=0.02)]
    assert out == [tool_chunk, "sau công cụ"]


def test_filler_is_stripped_from_assistant_history():
    from app.voicebot.processors.turn_filler import strip_filler_from_history

    ctx = SimpleNamespace(items=[
        SimpleNamespace(role="assistant", content=[FILLER_VN + " Bạn còn 3 chuyến."]),
        SimpleNamespace(role="user", content=[FILLER_VN]),
    ])
    strip_filler_from_history(ctx)
    assert ctx.items[0].content == ["Bạn còn 3 chuyến."]
    assert ctx.items[1].content == [FILLER_VN]
