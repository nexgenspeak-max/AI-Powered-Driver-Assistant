"""LlamaIndex RAG service — per-language playbook indexes (vi / en)."""

from __future__ import annotations

import asyncio
import logging
from functools import lru_cache

from app.config.settings import get_settings
from app.rag.paths import FAQ_LANGUAGES, index_dir, normalize_language
from app.rag.prompts import VOICE_SYNTHESIS_PROMPT_EN, VOICE_SYNTHESIS_PROMPT_VI
from llama_index.core import Settings as LlamaSettings
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI

logger = logging.getLogger("voice-agent.rag")


class FaqRagService:
    """Lazy-loaded LlamaIndex query engines — one index per language."""

    def __init__(self) -> None:
        self._query_engines: dict[str, object] = {}
        self._load_errors: dict[str, str] = {}
        self._llm = None
        self._embed_model = None
        self._shared_init_done = False

    def is_ready(self, language: str = "vi") -> bool:
        lang = normalize_language(language)
        return lang in self._query_engines

    def load_error(self, language: str = "vi") -> str | None:
        lang = normalize_language(language)
        return self._load_errors.get(lang)

    def _init_shared_models(self) -> bool:
        if self._shared_init_done:
            return self._llm is not None

        settings = get_settings()
        if not settings.faq_rag_enabled:
            for lang in FAQ_LANGUAGES:
                self._load_errors[lang] = "FAQ RAG is disabled (FAQ_RAG_ENABLED=false)"
            self._shared_init_done = True
            return False

        if not settings.openai_api_key:
            for lang in FAQ_LANGUAGES:
                self._load_errors[lang] = "OPENAI_API_KEY required for FAQ RAG"
            self._shared_init_done = True
            return False

        try:
            self._embed_model = OpenAIEmbedding(
                model=settings.faq_embed_model,
                api_key=settings.openai_api_key,
            )
            self._llm = OpenAI(
                model=settings.llm_model,
                api_key=settings.openai_api_key,
                temperature=0.2,
            )
            LlamaSettings.embed_model = self._embed_model
            LlamaSettings.llm = self._llm
            self._shared_init_done = True
            return True
        except Exception as exc:
            for lang in FAQ_LANGUAGES:
                self._load_errors[lang] = str(exc)
            logger.error("Failed to init FAQ RAG models: %s", exc, exc_info=True)
            self._shared_init_done = True
            return False

    def _ensure_loaded(self, language: str) -> None:
        lang = normalize_language(language)
        if lang in self._query_engines or lang in self._load_errors:
            return

        if not self._init_shared_models():
            return

        settings = get_settings()
        lang_index_dir = index_dir(settings, lang)
        if not lang_index_dir.exists():
            self._load_errors[lang] = (
                f"FAQ index not found at {lang_index_dir}. "
                f"Run: ENV=local python scripts/build_faq_index.py --lang {lang}"
            )
            logger.warning(self._load_errors[lang])
            return

        try:
            from llama_index.core import StorageContext, load_index_from_storage

            storage = StorageContext.from_defaults(persist_dir=str(lang_index_dir))
            idx = load_index_from_storage(storage, embed_model=self._embed_model)
            self._query_engines[lang] = idx.as_query_engine(
                similarity_top_k=settings.faq_top_k,
                response_mode="no_text",
            )
            logger.info("FAQ RAG index loaded | lang=%s path=%s", lang, lang_index_dir)
        except Exception as exc:
            self._load_errors[lang] = str(exc)
            logger.error("Failed to load FAQ index for %s: %s", lang, exc, exc_info=True)

    def _retrieve_context(self, question: str, language: str) -> str:
        lang = normalize_language(language)
        self._ensure_loaded(lang)
        engine = self._query_engines.get(lang)
        if not engine:
            raise RuntimeError(self._load_errors.get(lang) or f"FAQ RAG not available for {lang}")

        response = engine.query(question)
        chunks: list[str] = []
        for node in response.source_nodes:
            text = node.node.get_content(metadata_mode="none").strip()
            if text:
                chunks.append(text)
        return "\n\n---\n\n".join(chunks) if chunks else ""

    def _synthesize(self, question: str, context: str, language: str) -> str:
        lang = normalize_language(language)
        if not context:
            if lang == "en":
                return (
                    "I don't have playbook information for that yet. "
                    "Please check the app or contact support."
                )
            return (
                "Tôi chưa có thông tin trong sổ tay hướng dẫn về câu hỏi này. "
                "Anh/chị thử xem trong app hoặc liên hệ hỗ trợ."
            )

        template = VOICE_SYNTHESIS_PROMPT_EN if lang == "en" else VOICE_SYNTHESIS_PROMPT_VI
        prompt = template.format(context=context, question=question)
        result = self._llm.complete(prompt)
        return str(result).strip()

    def answer_sync(self, question: str, language: str = "vi") -> str:
        lang = normalize_language(language)
        try:
            context = self._retrieve_context(question, lang)
            return self._synthesize(question, context, lang)
        except RuntimeError as exc:
            logger.warning("FAQ RAG unavailable [%s]: %s", lang, exc)
            if lang == "en":
                return "The app guide is not available right now. Please try again later."
            return "Sổ tay hướng dẫn tạm thời không khả dụng. Anh/chị thử lại sau."
        except Exception:
            logger.error("answer_app_faq failed [%s]", lang, exc_info=True)
            if lang == "en":
                return "Sorry, I couldn't look that up. Please try again."
            return "Xin lỗi, tôi chưa tra được thông tin. Anh/chị thử lại giúp tôi."

    async def answer(self, question: str, language: str = "vi") -> str:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.answer_sync, question, language)


@lru_cache
def get_faq_rag_service() -> FaqRagService:
    return FaqRagService()
