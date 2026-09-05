"""Guard: locale driver tools must speak_and_stop — never bare as_llm (keeps TTS <2s)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "app" / "voicebot" / "locales"


def test_no_as_llm_left_in_locale_tools():
    offenders: list[str] = []
    for path in ROOT.glob("*/tools/*.py"):
        if path.name == "__init__.py":
            continue
        text = path.read_text(encoding="utf-8")
        if "as_llm" in text:
            offenders.append(str(path.relative_to(ROOT.parents[2])))
    assert not offenders, "as_llm still present (causes LLM rewrite / >2s):\n" + "\n".join(
        offenders
    )
