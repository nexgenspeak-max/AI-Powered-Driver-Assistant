"""Filter raw tool-name leaks from transcripts."""
from app.voicebot.processors.transcript_filter import is_raw_tool_token


def test_end_conversation_token_filtered():
    assert is_raw_tool_token("end_conversation")
    assert is_raw_tool_token("check_upcoming_trips")


def test_natural_speech_not_filtered():
    assert not is_raw_tool_token("Vâng, tạm biệt bạn!")
    assert not is_raw_tool_token("Ok bạn.")
    assert not is_raw_tool_token("end")
