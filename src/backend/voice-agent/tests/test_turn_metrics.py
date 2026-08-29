"""Speech-end to first audio ≥ 2s is SLOW."""
from types import SimpleNamespace
from unittest.mock import patch

from app.agent.turn_metrics import attach, mark_user_stopped, summarize


class _FakeSession:
    def __init__(self) -> None:
        self.handlers: dict[str, object] = {}

    def on(self, name: str):
        def deco(fn):
            self.handlers[name] = fn
            return fn

        return deco

    def emit(self, name: str, ev) -> None:
        self.handlers[name](ev)


def test_turn_over_2s_is_slow():
    total, slow = summarize(0.8, 1.3, 0.2)
    assert round(total, 2) == 2.3
    assert slow is True
    _, ok = summarize(0.3, 0.5, 0.2)
    assert ok is False


def test_wall_clock_user_stop_to_agent_speak_marks_slow():
    session = _FakeSession()
    attach(session)
    user_ev = SimpleNamespace(old_state="speaking", new_state="listening")
    agent_ev = SimpleNamespace(old_state="thinking", new_state="speaking")

    with (
        patch("app.agent.turn_metrics.time.perf_counter", side_effect=[1.0, 3.2]),
        patch("app.agent.turn_metrics.event") as mock_event,
    ):
        session.emit("user_state_changed", user_ev)
        session.emit("agent_state_changed", agent_ev)

    mock_event.assert_called_once()
    kwargs = mock_event.call_args.kwargs
    assert kwargs["ok"] is False
    assert kwargs["slow"] is True
    assert abs(kwargs["duration_ms"] - 2200) < 1


def test_chat_text_marks_user_stopped_for_wall_clock():
    session = _FakeSession()
    session.userdata = {}
    attach(session)
    agent_ev = SimpleNamespace(old_state="thinking", new_state="speaking")

    with (
        patch("app.agent.turn_metrics.time.perf_counter", side_effect=[5.0, 6.5]),
        patch("app.agent.turn_metrics.event") as mock_event,
    ):
        mark_user_stopped(session)
        session.emit("agent_state_changed", agent_ev)

    mock_event.assert_called_once()
    kwargs = mock_event.call_args.kwargs
    assert kwargs["ok"] is True
    assert kwargs["slow"] is False
    assert abs(kwargs["duration_ms"] - 1500) < 1


def test_wall_clock_ignores_greeting_without_user_speech():
    session = _FakeSession()
    attach(session)
    agent_ev = SimpleNamespace(old_state="idle", new_state="speaking")

    with patch("app.agent.turn_metrics.event") as mock_event:
        session.emit("agent_state_changed", agent_ev)

    mock_event.assert_not_called()
