"""VN sessions must disable LiveKit's default turn detector.

The SDK ignores the deprecated turn_detection= kwarg when turn_handling is
set and otherwise installs inference.TurnDetector(), which does not support
Vietnamese.
"""
from unittest.mock import MagicMock, patch

from app.agent.session import turn_handling_for_lang


def test_vn_nests_vad_only_inside_turn_handling():
    opts = turn_handling_for_lang("vn")
    assert opts["turn_detection"] is None
    assert opts["endpointing"]["min_delay"] == 0.25
    assert opts["endpointing"]["max_delay"] == 0.55
    assert opts["preemptive_generation"]["enabled"] is True
    assert opts["preemptive_generation"]["preemptive_tts"] is True
    assert opts["interruption"]["false_interruption_timeout"] == 0.5
    assert opts["interruption"]["min_duration"] == 0.3


@patch("app.agent.session.MultilingualModel")
def test_en_keeps_multilingual_turn_detector(model_cls):
    instance = MagicMock()
    model_cls.return_value = instance
    opts = turn_handling_for_lang("en")
    assert opts["turn_detection"] is instance
    model_cls.assert_called_once_with()

