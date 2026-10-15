"""In-app driver rooms use a UUID suffix, not only unix timestamps."""
from app.agent.session import _parse_room


def test_unix_ts_driver_room():
    mode, phone = _parse_room("driver-84867347452-1748700000")
    assert mode == "driver"
    assert phone == "84867347452"


def test_uuid_suffix_driver_room():
    mode, phone = _parse_room("driver-0900000001-d4963ecd-2341-4056-8425-64a663ca7a4d")
    assert mode == "driver"
    assert phone == "0900000001"


def test_unknown_room_logs_warning(caplog):
    """AVDA-68: a room name matching no pattern falls back to driver mode and is logged."""
    import logging

    with caplog.at_level(logging.WARNING):
        mode, phone = _parse_room("weird-room-name")
    assert (mode, phone) == ("driver", "")
    assert any("matched no pattern" in r.getMessage() for r in caplog.records)


def test_known_room_does_not_warn(caplog):
    import logging

    with caplog.at_level(logging.WARNING):
        _parse_room("driver-0900000001-1700000000")
    assert not any("matched no pattern" in r.getMessage() for r in caplog.records)
