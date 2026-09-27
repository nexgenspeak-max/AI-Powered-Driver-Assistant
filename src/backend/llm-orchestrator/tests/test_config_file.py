"""Config toml supplies non-secrets; env and the example files stay key-only."""

from pathlib import Path

from app.config.settings import Settings, get_settings

_ROOT = Path(__file__).resolve().parents[1]


def test_config_file_supplies_provider_when_env_absent(tmp_path, monkeypatch):
    monkeypatch.delenv("STT_PROVIDER", raising=False)
    monkeypatch.delenv("LLM_MODEL", raising=False)
    cfg = tmp_path / "config.toml"
    cfg.write_text('stt_provider = "google"\nllm_model = "gpt-5.6-luna"\n')
    monkeypatch.setenv("CONFIG_FILE", str(cfg))
    get_settings.cache_clear()
    settings = Settings()
    assert settings.stt_provider == "google"
    assert settings.llm_model == "gpt-5.6-luna"
    get_settings.cache_clear()


def test_env_overrides_config_file(tmp_path, monkeypatch):
    cfg = tmp_path / "config.toml"
    cfg.write_text('stt_provider = "google"\n')
    monkeypatch.setenv("CONFIG_FILE", str(cfg))
    monkeypatch.setenv("STT_PROVIDER", "openai")
    settings = Settings()
    assert settings.stt_provider == "openai"


def test_example_files_split_keys_from_config():
    config = (_ROOT / "envs" / "config.example.toml").read_text()
    env = (_ROOT / "envs" / ".env.example").read_text()
    assert 'stt_provider = "openai"' in config
    assert "trip_service_url" in config
    assert "API_KEY" not in config
    assert "SECRET" not in config
    assert "sk-" not in config
    assert "OPENAI_API_KEY=" in env
    assert "STT_PROVIDER" not in env
    assert "LIVEKIT_URL" not in env
