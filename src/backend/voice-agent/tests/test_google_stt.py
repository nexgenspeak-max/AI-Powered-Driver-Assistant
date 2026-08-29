"""Google STT model/location pairing — vi-VN is only GA on certain regions."""

from app.config.settings import Settings
from app.providers.google_cloud import (
    GOOGLE_STT_VI_VN_SUPPORT,
    default_stt_location,
    resolve_google_stt_location,
    resolve_google_stt_model,
)


def test_chirp_3_defaults_to_us_not_asia_southeast1():
    # Google pulled chirp_3+vi-VN from asia-southeast1 (403: "no longer generally available").
    # GA regions for Chirp 3 transcription are us and eu only.
    assert default_stt_location("chirp_3") == "us"
    assert "asia-southeast1" not in GOOGLE_STT_VI_VN_SUPPORT["chirp_3"]
    assert GOOGLE_STT_VI_VN_SUPPORT["chirp_3"] == frozenset({"us", "eu"})


def test_chirp_3_explicit_empty_location_resolves_to_us():
    assert resolve_google_stt_location("chirp_3", "") == "us"


def test_chirp_2_still_defaults_to_asia_southeast1():
    assert default_stt_location("chirp_2") == "asia-southeast1"
    assert "asia-southeast1" in GOOGLE_STT_VI_VN_SUPPORT["chirp_2"]


def test_settings_field_default_is_chirp_3_in_us():
    assert Settings.model_fields["google_stt_model"].default == "chirp_3"
    assert default_stt_location("chirp_3") == "us"


def test_unspecified_google_stt_falls_back_to_chirp_3():
    settings = Settings(google_stt_model="", stt_model="whisper-1")
    assert resolve_google_stt_model(settings) == "chirp_3"


def test_stt_plugin_kwargs_skips_punctuation_and_hints_confirm_phrase():
    from app.providers.stt.google import stt_plugin_kwargs

    settings = Settings(google_stt_model="chirp_2", stt_language="vi-VN")
    kwargs = stt_plugin_kwargs(settings)
    assert kwargs["punctuate"] is False
    assert "speech_end_timeout" not in kwargs
    assert "endpointing_sensitivity" not in kwargs
    phrases = [p for p, _boost in kwargs["keywords"]]
    assert "xác nhận nhận chuyến" in phrases


def test_chirp_3_uses_supershort_endpointing_not_speech_end_timeout():
    from app.providers.stt.google import stt_plugin_kwargs

    settings = Settings(google_stt_model="chirp_3", google_stt_location="", stt_language="vi-VN")
    kwargs = stt_plugin_kwargs(settings)
    assert kwargs["model"] == "chirp_3"
    assert kwargs["location"] == "us"
    assert kwargs["endpointing_sensitivity"] == "ENDPOINTING_SENSITIVITY_SUPERSHORT"
    assert "speech_end_timeout" not in kwargs


def test_chirp_3_asia_location_is_coerced_to_us_for_vi():
    from app.providers.stt.google import stt_plugin_kwargs

    settings = Settings(
        google_stt_model="chirp_3",
        google_stt_location="asia-southeast1",
        stt_language="vi-VN",
    )
    kwargs = stt_plugin_kwargs(settings)
    assert kwargs["location"] == "us"
    assert kwargs["endpointing_sensitivity"] == "ENDPOINTING_SENSITIVITY_SUPERSHORT"
