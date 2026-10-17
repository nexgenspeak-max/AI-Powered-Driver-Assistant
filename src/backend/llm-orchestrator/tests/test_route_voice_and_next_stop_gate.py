"""Voice-friendly optimal route + on-demand next stop never blocked by the opt-in."""
from app.voicebot.processors.context_store import load_driver_context
from app.voicebot.processors.next_stop import build_next_stop_suggestion
from app.voicebot.processors.tool_response_builders import build_route_response
from app.voicebot.processors.trip_format import format_route_order, route_order_lines
from app.voicebot.testing.conversation_quality import assert_natural_vn, assert_tts_safe_vn

_ROUTE = {
    "source": "goong_matrix",
    "stops": [
        {"trip_id": "a", "kind": "pickup", "customer_name": "An", "address": "54 Liễu Giai, Ba Đình, Hà Nội",
         "lat": 21.03, "lng": 105.81, "distance_m": 1800, "eta_minutes": 6},
        {"trip_id": "a", "kind": "dropoff", "customer_name": "An", "address": "Sân bay Nội Bài, Sóc Sơn",
         "lat": 21.22, "lng": 105.80, "distance_m": 27000, "eta_minutes": 38},
        {"trip_id": "b", "kind": "pickup", "customer_name": "Bình", "address": "Vincom Bà Triệu, Hai Bà Trưng",
         "lat": 21.01, "lng": 105.85, "distance_m": 31000, "eta_minutes": 44},
    ],
}


def test_route_order_spoken_is_first_stop_plus_totals():
    spoken = format_route_order(_ROUTE, lang="vi")
    assert spoken.startswith("Đi 54 Liễu Giai")
    assert "đón khách An" in spoken
    assert "Tổng 3 điểm" in spoken
    assert "59.8 km" in spoken and "88 phút" in spoken
    # The old reply listed every stop; the spoken line must stay short.
    assert "Vincom" not in spoken
    assert_natural_vn(spoken, max_chars=200, max_sentences=3)
    assert_tts_safe_vn(spoken)


def test_route_order_fallback_flags_estimate():
    spoken = format_route_order({**_ROUTE, "source": "haversine_fallback"}, lang="vi")
    assert "chưa có dữ liệu giao thông" in spoken.lower()


def test_route_order_single_stop_has_no_totals():
    spoken = format_route_order({"stops": _ROUTE["stops"][:1]}, lang="vi")
    assert "Tổng" not in spoken


def test_route_response_follow_up_carries_every_stop():
    resp = build_route_response(_ROUTE, lang="vi")
    lines = route_order_lines(_ROUTE, lang="vi")
    assert len(lines) == 3
    assert lines[1].startswith("điểm 2: trả khách An")
    for line in lines:
        assert line in resp.follow_up_knowledge
    assert "Vincom" in resp.to_template()


def _userdata_with_two_stops(auto_suggest: bool) -> dict:
    userdata = {}
    load_driver_context(userdata, {
        "current_location": {"lat": 21.03, "lng": 105.81},
        "upcoming_trips": [
            {"trip_id": "a", "status": "confirmed", "customer_name": "An",
             "pickup_address": "54 Liễu Giai, Ba Đình", "pickup_lat": 21.031, "pickup_lng": 105.811},
            {"trip_id": "b", "status": "confirmed", "customer_name": "Bình",
             "pickup_address": "Vincom Bà Triệu", "pickup_lat": 21.01, "pickup_lng": 105.85},
        ],
        "driver_settings": {"auto_suggest_next_stop": auto_suggest},
    })
    return userdata


def test_on_demand_next_stop_ignores_auto_suggest_setting():
    msg = build_next_stop_suggestion(_userdata_with_two_stops(auto_suggest=False), lang="vi")
    assert "Cài đặt" not in msg
    assert "An" in msg


def test_proactive_next_stop_still_respects_opt_in():
    msg = build_next_stop_suggestion(
        _userdata_with_two_stops(auto_suggest=False), lang="vi", proactive=True,
    )
    assert "Cài đặt" in msg
