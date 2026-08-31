"""Driver inbound mapping must stay compact — it is prepended to every LLM turn."""
from app.voicebot.locales.en.tools_mapping import TOOLS_MAPPING_PROMPT as EN
from app.voicebot.locales.vn.tools_mapping import TOOLS_MAPPING_PROMPT as VN


def test_driver_mapping_is_compact():
    # Live confirm_trip with the previous ~17k mapping used ~14k prompt tokens
    # and 1.65s LLM TTFT. Keep this under 4k chars (~1k tokens).
    assert len(VN) < 4000
    assert len(EN) < 4000
    assert "confirm_trip" in VN
    assert "confirm_trip" in EN
    assert "book_trip" not in VN
    assert "book_trip" not in EN


def test_inbound_prompt_is_compact():
    from app.voicebot.locales.en.system_instructions import INBOUND_PROMPT as EN_IN
    from app.voicebot.locales.vn.system_instructions import INBOUND_PROMPT as VN_IN

    # Grew with tool-parity + ResponseTemplate rules (2026-08); hard cap still blocks drift.
    assert len(VN_IN) < 3200
    assert len(EN_IN) < 3200
    assert "end_conversation" in VN_IN
    assert "end_conversation" in EN_IN


def test_tool_schema_descriptions_are_clipped():
    from app.voicebot.schema_compact import compact_raw_schema
    from app.voicebot.locales.vn.tools_definition import raw_schema

    for spec in raw_schema.values():
        assert len(spec.get("description") or "") <= 180
        props = (spec.get("parameters") or {}).get("properties") or {}
        for prop in props.values():
            assert len(prop.get("description") or "") <= 90

    bulky = {
        "demo": {
            "description": "x" * 400,
            "parameters": {"properties": {"a": {"description": "y" * 200}}},
        }
    }
    compact_raw_schema(bulky)
    assert len(bulky["demo"]["description"]) == 180
    assert bulky["demo"]["description"].endswith("…")
