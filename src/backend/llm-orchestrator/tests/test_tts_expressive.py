"""ElevenLabs voice/model selection and expressive markup (audio tags, pauses).

Tags such as [chuckles] must reach only TTS models that perform them
(ElevenLabs eleven_v3 / eleven_v4*), never be read aloud by another TTS, and
never show up in the transcript.
"""
from __future__ import annotations

from types import SimpleNamespace

import pytest
from livekit.agents.types import TimedString

from app.config.settings import DEFAULT_ELEVENLABS_VOICE_ID, Settings
from app.providers.tts import elevenlabs as elevenlabs_provider
from app.providers.tts.markup import (
    MarkupStreamFilter,
    guard_tts,
    model_supports_audio_tags,
    render_markup,
    render_markup_stream,
    strip_markup,
    tts_supports_audio_tags,
)
from app.voicebot.prompts import expressive
from app.voicebot.speech_text_fix import SpeechTextFixMixin, _strip_markup_for_transcript


def _settings(**overrides) -> Settings:
    base = {"elevenlabs_api_key": "test-key", "jwt_secret": "x"}
    base.update(overrides)
    return Settings(**base)


async def _aiter(items):
    for item in items:
        yield item


async def _collect(aiter) -> list:
    return [x async for x in aiter]


# ── Defaults ────────────────────────────────────────────────────────────────


def test_defaults_use_native_vietnamese_voice_on_v4_turbo():
    s = Settings(jwt_secret="x", _env_file=None)
    assert s.elevenlabs_model == "eleven_v4_turbo"
    assert s.elevenlabs_voice_id == DEFAULT_ELEVENLABS_VOICE_ID
    assert s.elevenlabs_language == "vi"
    assert s.tts_expressive is True


@pytest.mark.parametrize(
    ("provider", "model", "expected"),
    [
        ("ElevenLabs", "eleven_v4_turbo", True),
        ("ElevenLabs", "eleven_v4", True),
        ("ElevenLabs", "eleven_v3", True),
        ("elevenlabs", "eleven_v3_conversational", True),
        ("ElevenLabs", "eleven_flash_v2_5", False),
        ("ElevenLabs", "eleven_turbo_v2_5", False),
        ("ElevenLabs", "eleven_multilingual_v2", False),
        ("Google", "eleven_v4_turbo", False),
        ("Google", "vi-VN-Chirp3-HD-Kore", False),
    ],
)
def test_model_supports_audio_tags(provider, model, expected):
    assert model_supports_audio_tags(provider, model) is expected


# ── render / strip ──────────────────────────────────────────────────────────


def test_render_keeps_whitelisted_tags_when_allowed():
    out = render_markup("[Chuckles] Dạ, cái này dễ mà. [short  pause] Đi thôi.", allow_tags=True)
    assert out == "[chuckles] Dạ, cái này dễ mà. [short pause] Đi thôi."


def test_render_drops_unknown_tags_even_when_allowed():
    out = render_markup("[sarcastically] Dạ, [shouts] xong rồi.", allow_tags=True)
    assert out == "Dạ, xong rồi."


def test_render_turns_break_into_pause_text():
    out = render_markup('Dạ, để mình xem <break time="0.4s"/> có rồi.', allow_tags=True)
    assert "<break" not in out
    assert "..." in out


def test_strip_removes_all_markup_and_tidies_spacing():
    out = strip_markup('[laughs] Dạ, kẹt quá [sighs] , <break time="1s" /> chờ chút nhé.')
    assert "[" not in out and "<" not in out
    assert "  " not in out
    assert out.startswith("Dạ, kẹt quá")
    assert out.endswith("chờ chút nhé.")


def test_strip_keeps_ordinary_text_untouched():
    text = "Đón ở số 12 Trần Duy Hưng, giá 85 nghìn đồng [ghi chú: cổng sau]."
    assert strip_markup(text) == text


# ── streaming filter ────────────────────────────────────────────────────────


def test_stream_filter_handles_tag_split_across_chunks():
    f = MarkupStreamFilter(allow_tags=False)
    chunks = ["[chuc", "kles] Dạ, ", "cái này dễ mà ", "[laughs]", " nhé."]
    out = "".join(f.feed(c) for c in chunks) + f.flush()
    assert out == "Dạ, cái này dễ mà nhé."


def test_stream_filter_keeps_split_tag_when_allowed():
    f = MarkupStreamFilter(allow_tags=True)
    chunks = ["Dạ ", "[sho", "rt pa", "use] ", "xong."]
    out = "".join(f.feed(c) for c in chunks) + f.flush()
    assert out == "Dạ [short pause] xong."


def test_stream_filter_releases_unclosed_bracket_at_end():
    f = MarkupStreamFilter(allow_tags=False)
    out = f.feed("Còn 5 < 6 phút") + f.flush()
    assert out == "Còn 5 < 6 phút"


async def test_render_markup_stream():
    out = await _collect(render_markup_stream(_aiter(["[warm", "ly] Chào bạn."]), allow_tags=False))
    assert "".join(out) == "Chào bạn."


# ── guard_tts (provider side) ───────────────────────────────────────────────


class _FakeStream:
    def __init__(self) -> None:
        self.pushed: list[str] = []
        self.flushes = 0

    def push_text(self, token: str) -> None:
        self.pushed.append(token)

    def flush(self) -> None:
        self.flushes += 1


class _FakeTTS:
    def __init__(self, provider: str, model: str) -> None:
        self.provider = provider
        self.model = model
        self.synth_texts: list[str] = []
        self.last_stream: _FakeStream | None = None

    def synthesize(self, text: str, **_kw):
        self.synth_texts.append(text)
        return text

    def stream(self, **_kw):
        self.last_stream = _FakeStream()
        return self.last_stream


def test_guard_strips_tags_for_google_stream_and_synthesize():
    tts = guard_tts(_FakeTTS("Google", "chirp3"))
    assert tts.synthesize("[chuckles] Dạ, xong rồi.") == "Dạ, xong rồi."

    stream = tts.stream()
    for token in ["[chu", "ckles] Dạ, ", "xong ", "rồi."]:
        stream.push_text(token)
    stream.flush()
    assert "".join(tts.last_stream.pushed) == "Dạ, xong rồi."
    assert tts.last_stream.flushes == 1


def test_guard_strips_tags_for_old_elevenlabs_models():
    tts = guard_tts(_FakeTTS("ElevenLabs", "eleven_flash_v2_5"))
    assert tts.synthesize("[laughs] Ok.") == "Ok."


def test_guard_leaves_tag_capable_model_untouched():
    tts = _FakeTTS("ElevenLabs", "eleven_v4_turbo")
    original = tts.synthesize
    assert guard_tts(tts) is tts
    assert tts.synthesize == original
    assert tts_supports_audio_tags(tts)


def test_guard_is_idempotent():
    tts = guard_tts(guard_tts(_FakeTTS("Google", "chirp3")))
    assert tts.synthesize("[sighs] Kẹt quá.") == "Kẹt quá."


def test_get_tts_guards_google_fallback(monkeypatch):
    import app.providers as providers

    s = _settings(tts_provider="elevenlabs", tts_fallback="google")
    monkeypatch.setattr(providers, "get_settings", lambda: s)
    fakes = {
        "elevenlabs": _FakeTTS("ElevenLabs", "eleven_v4_turbo"),
        "google": _FakeTTS("Google", "chirp3"),
    }
    monkeypatch.setattr(
        providers,
        "_TTS",
        {name: SimpleNamespace(create=lambda _s, n=name: fakes[n]) for name in fakes},
    )
    captured = {}

    def fake_with_fallback(instances, _adapter, **_kw):
        captured["instances"] = instances
        return instances[0]

    monkeypatch.setattr(providers, "with_fallback", fake_with_fallback)
    monkeypatch.setattr(providers, "log_provider_availability", lambda *a, **k: None)
    providers.get_tts()

    primary, backup = captured["instances"]
    assert primary.synthesize("[chuckles] Ok.") == "[chuckles] Ok."
    assert backup.synthesize("[chuckles] Ok.") == "Ok."


# ── ElevenLabs provider ─────────────────────────────────────────────────────


def _capture_plugin(monkeypatch) -> dict:
    captured: dict = {}

    def fake_tts(**kwargs):
        captured.update(kwargs)
        return SimpleNamespace(**kwargs)

    monkeypatch.setattr(elevenlabs_provider.elevenlabs_plugin, "TTS", fake_tts)
    return captured


def test_elevenlabs_v4_sends_stability_only(monkeypatch):
    captured = _capture_plugin(monkeypatch)
    elevenlabs_provider.ElevenLabsTTS.create(_settings(elevenlabs_stability=0.4))
    vs = captured["voice_settings"]
    assert captured["model"] == "eleven_v4_turbo"
    assert captured["voice_id"] == DEFAULT_ELEVENLABS_VOICE_ID
    assert captured["language"] == "vi"
    assert vs.stability == 0.4
    assert vs.similarity_boost is None


def test_elevenlabs_flash_keeps_full_voice_settings(monkeypatch):
    captured = _capture_plugin(monkeypatch)
    elevenlabs_provider.ElevenLabsTTS.create(
        _settings(elevenlabs_model="eleven_flash_v2_5", elevenlabs_speed=1.05)
    )
    vs = captured["voice_settings"]
    assert vs.similarity_boost == 0.75
    assert vs.speed == 1.05


def test_elevenlabs_voice_override_and_empty_fallback(monkeypatch):
    captured = _capture_plugin(monkeypatch)
    elevenlabs_provider.ElevenLabsTTS.create(_settings(tts_voice="custom-voice"))
    assert captured["voice_id"] == "custom-voice"

    captured = _capture_plugin(monkeypatch)
    elevenlabs_provider.ElevenLabsTTS.create(_settings(elevenlabs_voice_id=""))
    assert captured["voice_id"] == DEFAULT_ELEVENLABS_VOICE_ID


def test_elevenlabs_language_can_be_left_to_the_model(monkeypatch):
    captured = _capture_plugin(monkeypatch)
    elevenlabs_provider.ElevenLabsTTS.create(_settings(elevenlabs_language=""))
    assert "language" not in captured


# ── Persona gating ──────────────────────────────────────────────────────────


def test_expressive_prompt_with_tags_on_v4():
    block = expressive.expressive_prompt_vn(_settings(tts_provider="elevenlabs"))
    assert "từ đệm" in block.lower()
    assert "[chuckles]" in block
    assert "KHÔNG đùa" in block


def test_expressive_prompt_without_tags_on_flash():
    block = expressive.expressive_prompt_vn(
        _settings(tts_provider="elevenlabs", elevenlabs_model="eleven_flash_v2_5")
    )
    assert "từ đệm" in block.lower()
    assert "[chuckles]" not in block


@pytest.mark.parametrize(
    "overrides",
    [{"tts_provider": "google"}, {"tts_provider": "elevenlabs", "tts_expressive": False}],
)
def test_expressive_prompt_off(overrides):
    s = _settings(**overrides)
    assert expressive.expressive_prompt_vn(s) == ""
    assert expressive.with_tag("[warmly]", "Chào bạn.", s) == "Chào bạn."


def test_with_tag_on_v4():
    s = _settings(tts_provider="elevenlabs")
    assert expressive.with_tag("[warmly]", "Chào bạn.", s) == "[warmly] Chào bạn."


# ── Agent nodes ─────────────────────────────────────────────────────────────


async def test_transcription_strips_tags_from_text_and_timed_words():
    chunks = [
        "[chuc",
        "kles] Dạ, xong rồi ",
        TimedString("[laughs]", start_time=0.0, end_time=0.1),
        TimedString("nhé.", start_time=0.1, end_time=0.3),
    ]
    out = await _collect(_strip_markup_for_transcript(_aiter(chunks)))
    assert "".join(str(x) for x in out) == "Dạ, xong rồi nhé."
    assert isinstance(out[-1], TimedString)


class _NodeAgent(SpeechTextFixMixin):
    def __init__(self, allow: bool) -> None:
        self._allow = allow

    def _allow_audio_tags(self) -> bool:
        return self._allow


async def _tts_node_text(monkeypatch, allow: bool, chunks: list[str]) -> str:
    from livekit.agents import Agent

    seen: list[str] = []

    async def fake_default_tts_node(_agent, text, _settings):
        async for chunk in text:
            seen.append(chunk)
        if False:
            yield None

    monkeypatch.setattr(Agent.default, "tts_node", fake_default_tts_node)
    async for _ in _NodeAgent(allow).tts_node(_aiter(chunks), None):
        pass
    return "".join(seen)


async def test_tts_node_keeps_tags_for_expressive_agent(monkeypatch):
    out = await _tts_node_text(monkeypatch, True, ["[chuck", "les] Dạ, gọi 0912345678 nhé."])
    assert out.startswith("[chuckles] Dạ,")
    assert "0, 9, 1, 2" in out  # number fixes still run after the markup step


async def test_tts_node_strips_tags_for_customer_facing_agent(monkeypatch):
    out = await _tts_node_text(monkeypatch, False, ["[laughs] Dạ, xong rồi."])
    assert out == "Dạ, xong rồi."


def test_cheerful_tags_kept_for_the_southern_voice():
    out = render_markup("[cheerfully] Dạ, [excited] có chuyến mới nè! [happy] Chúc bạn chạy vui nha.", allow_tags=True)
    assert out == "[cheerfully] Dạ, [excited] có chuyến mới nè! [happy] Chúc bạn chạy vui nha."
