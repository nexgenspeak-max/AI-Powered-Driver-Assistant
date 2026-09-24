from unittest.mock import MagicMock

from app.providers.llm.kimi import KimiLLM, extra_body_for_voice
from app.providers.llm.openai import reasoning_effort_for_voice


def test_gpt56_luna_uses_no_reasoning():
    assert reasoning_effort_for_voice("gpt-5.6-luna") == "none"
    assert reasoning_effort_for_voice("gpt-5.4-mini") == "none"
    assert reasoning_effort_for_voice("gpt-4o") is None


def test_k2_6_disables_thinking_for_voice():
    assert extra_body_for_voice("kimi-k2.6") == {"thinking": {"type": "disabled"}}
    assert extra_body_for_voice("moonshotai/kimi-k2.6") == {"thinking": {"type": "disabled"}}


def test_other_models_leave_thinking_unset():
    assert extra_body_for_voice("kimi-k3") is None
    assert extra_body_for_voice("gpt-4o-mini") is None


def test_kimi_llm_wires_extra_body_on_direct_client():
    settings = MagicMock()
    settings.kimi_api_key = "sk-test"
    settings.kimi_base_url = "https://api.moonshot.ai/v1"
    settings.llm_model = "moonshotai/kimi-k2.6"
    llm = KimiLLM.create(settings)
    assert llm._opts.extra_body == {"thinking": {"type": "disabled"}}
