"""Tests for structured tool response templates."""
from app.voicebot.processors.trip_response import (
    build_earnings_response,
    build_trip_count_response,
    build_trip_detail_response,
)
from app.voicebot.prompts.tool_response import ToolResponse


def _sample_trip() -> dict:
    return {
        "trip_id": "t1",
        "status": "confirmed",
        "customer_name": "NexGen Speak",
        "pickup_address": "54 Liễu Giai, Ba Đình, Hà Nội",
        "dropoff_address": "45 Nguyễn Huệ, Q1",
        "pickup_time": "12:30",
        "distance_km": 286,
        "eta_minutes": 281,
        "customer_phone": "+84901234567",
        "estimated_fare": 3_447_000,
    }


def test_tool_response_template_has_four_sections():
    resp = build_trip_detail_response(_sample_trip(), 1, lang="vi")
    tpl = resp.to_template()
    assert "<ResponseTemplate>" in tpl
    assert "<KnowledgeData>" in tpl
    assert "<ResponseRule>" in tpl
    assert "<ResponseKnowledge>" in tpl
    assert "<FollowUpKnowledge>" in tpl
    assert "<ActionKnowledge>" in tpl
    assert "call_customer" in tpl
    assert "trip_index: 1" in tpl
    assert "pickup_time: 12:30" in tpl


def test_spoken_is_short_one_line():
    resp = build_trip_detail_response(_sample_trip(), 1, lang="vi")
    spoken = resp.spoken()
    assert "<" not in spoken
    assert "NexGen Speak" in spoken
    assert len(spoken) < 100
    assert any("0912012903" in row or "+84901234567" in row for row in resp.follow_up_knowledge)


def test_trip_count_includes_brief_follow_up_rows():
    trips = [_sample_trip(), {**_sample_trip(), "trip_id": "t2", "customer_name": "Bob"}]
    resp = build_trip_count_response(trips, lang="vi")
    assert "7" not in resp.spoken()
    assert "2 chuyến" in resp.spoken()
    assert any("Bob" in row for row in resp.follow_up_knowledge)
    tpl = resp.to_template()
    assert "customer_phone: +84901234567" in tpl
    assert "pickup_address: 54 Liễu Giai" in tpl


def test_single_trip_count_has_full_knowledge_short_spoken():
    resp = build_trip_count_response([_sample_trip()], lang="vi")
    assert "NexGen Speak" in resp.spoken()
    assert "Liễu Giai" not in resp.spoken()
    tpl = resp.to_template()
    assert "customer_phone: +84901234567" in tpl
    assert any("điểm đón" in row for row in resp.follow_up_knowledge)


def test_earnings_follow_up_has_bonus_and_hours():
    resp = build_earnings_response(
        {"total_earnings": 500_000, "trip_count": 3, "bonus_earnings": 50_000, "hours_online": 4.5},
        lang="vi",
    )
    assert "500.000đ" in resp.spoken()
    assert any("bonus" in row for row in resp.follow_up_knowledge)


def test_wrap_simple_tool_response():
    resp = ToolResponse.simple(tool="test", spoken="Ok.", follow_up=["detail here"])
    assert resp.spoken() == "Ok."
    assert "detail here" in resp.to_template()


def test_spoken_from_template_extracts_response_knowledge():
    resp = ToolResponse.simple(
        tool="call_customer",
        spoken="Bạn đang có nhiều chuyến, muốn gọi khách nào?",
        follow_up=["Chọn số thứ tự"],
        action=["Gọi khách: call_customer(...)"],
    )
    tpl = resp.to_template()
    spoken = ToolResponse.spoken_from_template(tpl)
    assert spoken == "Bạn đang có nhiều chuyến, muốn gọi khách nào?"
    assert "<ResponseTemplate>" not in spoken
    assert ToolResponse.is_template(tpl)
    assert not ToolResponse.is_template(spoken)


def test_get_last_tool_response_hint_is_compact_not_xml():
    from app.voicebot.processors import context_store

    userdata: dict = {"context": {}}
    resp = ToolResponse.simple(
        tool="call_customer",
        spoken="Chọn khách để gọi.",
        follow_up=["Tên khách"],
        action=["Gọi khách: call_customer(mode=agent)"],
    )
    context_store.set_last_tool_response(userdata, resp)
    hint = context_store.get_last_tool_response_hint(userdata, lang="vi")
    assert "Chọn khách để gọi." in hint
    assert "<ResponseTemplate>" not in hint
    assert "KHÔNG đọc thẻ XML" in hint
    assert "Tên khách" in hint
