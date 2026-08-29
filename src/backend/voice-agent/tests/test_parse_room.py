"""In-app driver rooms use a UUID suffix, not only unix timestamps."""
from app.agent.session import _parse_room


def test_unix_ts_driver_room():
    mode, phone = _parse_room("driver-84867347452-1748700000")
    assert mode == "driver"
    assert phone == "84867347452"


def test_uuid_suffix_driver_room():
    mode, phone = _parse_room("driver-0888887798-d4963ecd-2341-4056-8425-64a663ca7a4d")
    assert mode == "driver"
    assert phone == "0888887798"
