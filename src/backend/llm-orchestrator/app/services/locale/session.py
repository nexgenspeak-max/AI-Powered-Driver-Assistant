"""Build SessionLocale from env + optional room metadata."""
from __future__ import annotations

from app.services.locale.loader import get_locale_bundle
from app.services.locale.resolver import resolve_routing_lang
from app.services.locale.types import SessionLocale, SpokenLang, VoiceRoutingLang


def resolve_session_locale(*, room_meta_lang: str | None = None) -> SessionLocale:
    routing: VoiceRoutingLang = resolve_routing_lang(room_meta_lang=room_meta_lang)
    bundle = get_locale_bundle(routing)
    spoken = str(bundle.get("spoken") or ("en" if routing == "en" else "vi"))
    return SessionLocale(
        routing=routing,
        spoken=spoken if spoken in ("vi", "en") else "vi",  # type: ignore[arg-type]
        stt=str(bundle.get("stt") or ""),
        tts_voice=str(bundle.get("tts_voice") or ""),
        turn_detection=str(bundle.get("turn_detection") or "none"),
    )
