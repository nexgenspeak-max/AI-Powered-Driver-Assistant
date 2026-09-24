"""Harness path must track locales/vn/tools after locale migration."""
from pathlib import Path

from app.voicebot.testing.trip_tool_verify import TRIP_AWARE_TOOLS, VN_TOOLS_DIR


def test_vn_tools_dir_points_at_locales():
    assert VN_TOOLS_DIR.is_dir(), f"missing tools dir: {VN_TOOLS_DIR}"
    assert "locales" in VN_TOOLS_DIR.parts
    assert (VN_TOOLS_DIR / "confirm_trip.py").is_file()
    assert (VN_TOOLS_DIR / "reject_trip.py").is_file()


def test_trip_aware_tools_have_resolve_markers():
    markers = ("resolve_customer_trip", "resolve_call_target", "resolve_trip_from_subset")
    for name in sorted(TRIP_AWARE_TOOLS):
        path = VN_TOOLS_DIR / f"{name}.py"
        assert path.is_file(), f"missing {name}"
        source = path.read_text(encoding="utf-8")
        assert any(m in source for m in markers), f"{name} lacks trip resolve marker"
