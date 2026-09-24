#!/usr/bin/env python3
"""
Build LlamaIndex vector indexes from requirements/knowledge/{vi,en}/*.md

Usage:
  cd src/backend/llm-orchestrator
  ENV=local python scripts/build_faq_index.py              # build vi + en
  ENV=local python scripts/build_faq_index.py --lang vi    # Vietnamese only
  ENV=local python scripts/build_faq_index.py --rebuild  # wipe and rebuild all
"""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from app.config.settings import get_settings  # noqa: E402
from app.rag.paths import FAQ_LANGUAGES, index_dir, knowledge_dir  # noqa: E402


def build_language(lang: str, rebuild: bool) -> bool:
    settings = get_settings()
    src = knowledge_dir(settings, lang)
    dst = index_dir(settings, lang)

    if not src.exists():
        print(f"ERROR: knowledge dir not found: {src}")
        return False

    md_files = [f for f in src.glob("*.md") if f.name.lower() != "readme.md"]
    if not md_files:
        print(f"ERROR: no .md files in {src}")
        return False

    if rebuild and dst.exists():
        shutil.rmtree(dst)
        print(f"Removed {dst}")

    dst.mkdir(parents=True, exist_ok=True)

    from llama_index.core import Settings as LlamaSettings
    from llama_index.core import SimpleDirectoryReader, VectorStoreIndex
    from llama_index.embeddings.openai import OpenAIEmbedding

    embed = OpenAIEmbedding(
        model=settings.faq_embed_model,
        api_key=settings.openai_api_key,
    )
    LlamaSettings.embed_model = embed

    print(f"[{lang}] Loading markdown from {src} ...")
    documents = SimpleDirectoryReader(
        input_dir=str(src),
        required_exts=[".md"],
        exclude_hidden=True,
        filename_as_id=True,
        exclude=["README.md", "readme.md"],
    ).load_data()

    print(f"[{lang}] Indexing {len(documents)} document(s) → {dst}")
    index = VectorStoreIndex.from_documents(documents, embed_model=embed)
    index.storage_context.persist(persist_dir=str(dst))
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Build FAQ RAG vector index from markdown")
    parser.add_argument(
        "--lang",
        choices=FAQ_LANGUAGES,
        help="Build one language only (default: both vi and en)",
    )
    parser.add_argument(
        "--rebuild",
        action="store_true",
        help="Delete existing index before rebuilding",
    )
    args = parser.parse_args()

    settings = get_settings()
    if not settings.openai_api_key:
        print("ERROR: OPENAI_API_KEY not set (needed for embeddings)")
        return 1

    langs = [args.lang] if args.lang else list(FAQ_LANGUAGES)
    ok = all(build_language(lang, args.rebuild) for lang in langs)

    if ok:
        print("Done. Restart voice-agent to use the new index(es).")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
